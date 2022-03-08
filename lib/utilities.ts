import chalk from 'chalk';
import config from '../src/cilok.config.json';
import Command from './command';
import CreateConnection from './connection';
import { format } from 'util';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import axios, { AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse } from 'axios';

export async function delay(ms: number): Promise<void> {
	new Promise((resolve) => setTimeout(resolve, ms));
}

export function wings(text: string) {
	return `${config.unicode.wings[0]}*${text.trim()}*${config.unicode.wings[1]}`;
}

export function isUrl(text: string): boolean {
	return /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&\/=]*)/gi.test(
		text,
	);
}

export function parseRegex(text: string): string {
	return text.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

export function autoPath(format: string, filename?: string, useTemp = true): string {
	if (useTemp && !existsSync(global.config.tempDir.split('/')[1]))
		mkdirSync(global.config.tempDir.split('/')[1]);
	const basePath = useTemp ? global.config.tempDir : '';
	return `${basePath}${
		filename
			? filename.includes('?>')
				? Date.now() + filename.split('?>')[1]
				: filename.includes('?<')
				? filename.split('?<')[1] + Date.now()
				: filename
			: Date.now()
	}${format && !format.includes('.') ? '.' + format : format}`;
}

export function headers(additional?: AxiosRequestConfig, additionalHeaders?: AxiosRequestHeaders) {
	return {
		headers: {
			'user-agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36 Edg/99.0.1150.30',
			'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="99", "Microsoft Edge";v="99"',
			...additionalHeaders,
		},
		...additional,
	};
}

export async function waVersion(): Promise<[number, number, number]> {
	const defaultVersion: [number, number, number] = [2, 2022, 12];
	try {
		const request: AxiosResponse = await axios.get(
			'https://web.whatsapp.com/check-update?version=1&platform=web',
			headers(),
		);
		if (request.status === 200 && request.data?.currentVersion) {
			return [
				Number(request.data.currentVersion.split('.')[0]),
				Number(request.data.currentVersion.split('.')[1]),
				Number(request.data.currentVersion.split('.')[2]),
			];
		} else {
			return defaultVersion;
		}
	} catch (e) {
		return defaultVersion;
	}
}

export function parseJson(
	json: object,
	options: {
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
		body: `${global.config.unicode.list} *%key :* %value`,
		footer: '------------',
		preResult: false,
		...options,
	};
	const content: string[][] = [];
	for (const [a, b] of Object.entries(json)) {
		if (opt.ignoreValue.indexOf(b) !== -1) continue;
		const key = a
			.replace(/[A-Z_]/g, (a) => a.replace(a, ` ${a !== '_' ? a.toLowerCase() : ''}`))
			.replace(/^\w/, (c) => c.toUpperCase());
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
						parseJson(b, {
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
		opt.header === ''
			? '' + '\n'
			: `${global.config.unicode.wings[0]}*${opt.header}*${global.config.unicode.wings[1]}\n`,
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

export async function run(): Promise<void> {
	try {
		console.clear();
		console.log(chalk.green('Starting running bot...'));
		await delay(2000);
		console.clear();
		console.log(chalk.cyan.bold(readFileSync('./src/misc/loader.txt').toString()));

		global.config = config;
		global.util = await import('./utilities');

		global.database = {};
		if (!existsSync('./src/database')) mkdirSync('./src/database');
		for (const a of readdirSync('./src/database/')) {
			global.database[a.replace('.json', '')] = (await import(`../src/database/${a}`)).default;
		}
		logger.database('Database loaded');

		global.client = await CreateConnection();
		global.command = new Command();

		for (const a of readdirSync('./lib/commands')) {
			(await import(`./commands/${a}`)).default;
		}

		for (const a of readdirSync('./lib/events')) {
			(await import(`./events/${a}`)).default;
		}

		return global.command.commandList.length > 0
			? logger.command(`Succesfully loaded ${global.command.commandList.length} commands`)
			: logger.warn('There is no command loaded');
	} catch (e) {
		throw util.logger.format(e);
	}
}

export const logger = {
	format: (message: any) => format(message),
	info: (message: any) => console.log(`${chalk.blueBright.bold('INFO')} | ${format(message)}`),
	warn: (message: any) => console.log(`${chalk.yellowBright.bold('WARNING')} | ${format(message)}`),
	command: (message: any) =>
		console.log(`${chalk.hex('#6ca8fc').bold('COMMAND')} | ${format(message)}`),
	database: (message: any) =>
		console.log(`${chalk.magentaBright.bold('DATABASE')} | ${format(message)}`),
};
