import chalk from 'chalk';
import config from '../src/cilok.config.json';
import Command from './command';
import CreateConnection from './connection';
import { format } from 'util';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import axios, { AxiosResponse } from 'axios';

export async function delay(ms: number): Promise<void> {
	new Promise((resolve) => setTimeout(resolve, ms));
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

export async function waVersion(): Promise<[number, number, number]> {
	const defaultVersion: [number, number, number] = [2, 2022, 12];
	try {
		const request: AxiosResponse = await axios.get(
			'https://web.whatsapp.com/check-update?version=1&platform=web',
			{
				headers: {
					'user-agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36 OPR/81.0.4196.61',
					'sec-a-ua': '"Opera GX";v="81", " Not;A Brand";v="99", "Chromium";v="95"',
				},
			},
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
		throw logger.error(e);
	}
}

export const logger = {
	info: (message: any) => console.log(`${chalk.blueBright.bold('INFO')} | ${format(message)}`),
	warn: (message: any) => console.log(`${chalk.yellowBright.bold('WARNING')} | ${format(message)}`),
	error: (message: any) => format(message),
	command: (message: any) =>
		console.log(`${chalk.hex('#6ca8fc').bold('COMMAND')} | ${format(message)}`),
	database: (message: any) =>
		console.log(`${chalk.magentaBright.bold('DATABASE')} | ${format(message)}`),
};
