import _ from 'lodash';
import dayjs from 'dayjs';
import chalk from 'chalk';
import config from '../../src/config.json';
import FormData from 'form-data';
import { format } from 'util';
import { AxiosRequestConfig, AxiosRequestHeaders } from 'axios';

export async function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function wings(text: string): string {
	return `${config.unicode.wings[0]}*${text.trim()}*${config.unicode.wings[1]}`;
}

export function url(text: string) {
	const regex =
		/^(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/i;
	return {
		isValid: regex.test(text),
		parse: text.match(regex)?.pop(),
	};
}

export function parseRegex(text: string): string {
	return text.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

export function isRegex(text: string) {
	return toString.call(text) === '[object RegExp]';
}

export function randomNumber(num1: number, num2?: number): number {
	return !num2 ? Math.floor(Math.random() * num1) : Math.floor(Math.random() * (num2 - num1)) + num1;
}

export function randomize<T>(data: T[], propertyPath?: string): T {
	let randomData = data.filter((v) => (propertyPath ? _.result(v, propertyPath) : v))[randomNumber(data.length)];
	if (propertyPath) randomData = _.result(randomData, propertyPath);
	return randomData;
}

export function autoPath(format?: string, filename?: string, useTemp = true): string {
	const basePath = useTemp ? config.path.temp : '';
	const baseName = 'clk' + (Math.random() + '').slice(10, 14);
	return `${basePath}${
		filename
			? filename.includes('?>')
				? baseName + filename.split('?>')[1]
				: filename.includes('?<')
				? filename.split('?<')[1] + Date.now()
				: filename
			: baseName
	}${format ? (!format.includes('.') ? `.${format}` : format) : ''}`;
}

export function headers(additional?: AxiosRequestConfig, additionalHeaders?: AxiosRequestHeaders): AxiosRequestConfig {
	return {
		headers: {
			'user-agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36 Edg/99.0.1150.30',
			'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="99", "Microsoft Edge";v="99"',
			dnt: '1',
			...additionalHeaders,
		},
		...additional,
	};
}

export const append = {
	params: (data: object): URLSearchParams => new URLSearchParams(Object.entries(data)),
	form: (data: object): FormData => {
		const form = new FormData();
		for (const a of Object.entries(data)) {
			form.append(a[0], a[1]);
		}
		return form;
	},
};

export function logger(
	tag: 'info' | 'warn' | 'error' | 'database' | 'measure' | { name: string; color: chalk.Chalk; loggerType?: 'info' | 'error' | 'warn' | 'debug' },
	message: any,
	...args: any[]
) {
	message = format(message, ...args);
	const defaultTag: Record<string, [chalk.Chalk, string]> = {
		info: [chalk.blueBright, 'info'],
		warn: [chalk.yellowBright, 'warn'],
		error: [chalk.redBright, 'error'],
		database: [chalk.greenBright, 'log'],
		measure: [chalk.magentaBright, 'log'],
	};
	const date = chalk.bgBlackBright(` ${dayjs().format().toString()} `);
	if (typeof tag === 'object') {
		console[tag.loggerType ?? 'log'](date, tag.color.bold(`[ ${tag.name.toUpperCase()} ]`), message);
	} else {
		(console as Record<string, any>)[defaultTag[tag][1]](date, defaultTag[tag][0].bold(`[ ${tag.toUpperCase()} ]`), message);
	}
}

export function parseJSON(
	json: object,
	options?: {
		ignoreValue?: any[];
		ignoreKey?: string[];
		header?: string;
		body?: string;
		footer?: string;
		preResult?: boolean;
	},
): string | string[][] {
	if (Object.entries(json).length === 0) throw new Error('No json input provided');
	const opt = {
		ignoreValue: [null, undefined],
		ignoreKey: [],
		header: '',
		body: `${config.unicode.bullet} *%key :* %value`,
		footer: config.unicode.dash.repeat(30),
		preResult: false,
		...options,
	};
	const content: string[][] = [];
	for (const [a, b] of Object.entries(json)) {
		if (opt.ignoreValue.indexOf(b) !== -1) continue;
		const key = a.replace(/[A-Z_]/g, (a) => a.replace(a, ` ${a !== '_' ? a.toLowerCase() : ''}`)).replace(/^\w/, (c) => c.toUpperCase());
		const type = typeof b;
		if (opt.ignoreKey && (opt.ignoreKey as string[]).includes(a)) continue;
		switch (type) {
			case 'boolean':
				content.push([key, b ? 'Ya' : 'Tidak']);
				break;
			case 'object':
				if (Array.isArray(b)) {
					content.push([key, b.join(', ')]);
				} else {
					content.push([
						key,
						parseJSON(b, {
							ignoreKey: opt.ignoreKey,
							preResult: true,
						}) as string,
					]);
				}
				break;
			default:
				content.push([key, b]);
				break;
		}
	}
	if (opt.preResult) return content;
	const compile: string[] = [
		opt.header === '' ? '' + '\n' : `${config.unicode.wings[0]}*${opt.header}*${config.unicode.wings[1]}\n`,
		content
			.map((a) => {
				return opt.body
					.replace(/%key/g, a[0])
					.replace(/%value/g, a[1])
					.trim();
			})
			.join('\n'),
		Array.isArray(json) ? `\n\n${opt.footer}\n` : '',
	];
	return compile.join('');
}

export function searchJSON<T>(obj: any, key: string | Array<string>, output?: any): T | undefined {
	if (typeof obj === 'object') {
		if (Array.isArray(key)) {
			if (!output) output = {};
			key.forEach((subKey) => {
				if (obj.hasOwnProperty(subKey)) {
					output[subKey] = obj[subKey] as T;
				}
				for (const k in obj) {
					if (obj.hasOwnProperty(k)) {
						let result = searchJSON(
							obj[k] as {
								[key: string]: unknown;
							},
							subKey,
							output,
						);
						if (result) {
							output[subKey] = result;
						}
					}
				}
			});
			return output;
		} else {
			if (obj.hasOwnProperty(key)) {
				return obj[key] as T;
			}
			for (const k in obj) {
				if (obj.hasOwnProperty(k)) {
					let result = searchJSON(obj[k] as { [key: string]: unknown }, key);
					if (result) {
						return result as T;
					}
				}
			}
		}
	}
}

String.prototype.normalizeJid = function (): string {
	return this.replace(/\:[0-9]{1,2}/, '');
};

String.prototype.compress = function () {
	const str = decodeURIComponent(encodeURIComponent(String(this)));
	let result = '',
		char: number,
		nextChar: number,
		combinedCharCode: string;
	for (let i = 0; i < str.length; i += 2) {
		char = str.charCodeAt(i);
		if (i + 1 < str.length) {
			// You need to make sure that you don't have 3 digits second character else you  might go over 65536.
			// But in UTF-16 the 32 characters aren't in your basic character set. But it's a limitation, anything
			// under charCode 32 will cause an error
			nextChar = str.charCodeAt(i + 1) - 31;
			// this is to pad the result, because you could have a code that is single digit, which would make
			// decompression a bit harder
			combinedCharCode =
				char +
				'' +
				nextChar.toLocaleString('en', {
					minimumIntegerDigits: 2,
				});
			// You take the concanated code string and convert it back to a number, then a character
			result += String.fromCharCode(parseInt(combinedCharCode, 10));
		} else result += str.charAt(i); // Here because you won't always have pair number length
	}
	return result;
};

String.prototype.decompress = function () {
	const str = String(this);
	let result = '',
		char,
		codeStr,
		firstCharCode,
		lastCharCode;
	for (let i = 0; i < str.length; i++) {
		char = str.charCodeAt(i);
		if (char > 132) {
			codeStr = char.toString(10);
			// You take the first part of the compressed char code, it's your first letter
			firstCharCode = parseInt(codeStr.substring(0, codeStr.length - 2), 10);
			// For the second one you need to add 31 back.
			lastCharCode = parseInt(codeStr.substring(codeStr.length - 2, codeStr.length), 10) + 31;
			// You put back the 2 characters you had originally
			result += String.fromCharCode(firstCharCode) + String.fromCharCode(lastCharCode);
		} else result += str.charAt(i);
	}
	return result;
};
