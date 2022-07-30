import path from 'path';
import chalk from 'chalk';
import config from '../src/config.json';
import Client from './client';
import Database from './database';
import NodeCache from 'node-cache';
import CommandHandler from './command';
import { ProcessMode } from './typings';
import { config as envConfig } from 'dotenv';
import * as fs from 'fs';
import * as utilities from './utilities';

utilities.Measure.start('run');

console.log(chalk.cyan.bold(fs.readFileSync('./src/misc/loader.txt', 'utf8')));

envConfig({
	path: './src/.env',
});

(async function () {
	try {
		const args: Array<ProcessMode | string> = process.argv
			.slice(2)
			.filter((v) => v.startsWith('--'))
			.map((v) => v.replace('--', ''));
		if (args.some((v) => v === 'dev')) process.env.NODE_ENV = 'dev';
		else process.env.NODE_ENV = 'production';

		globalThis.statusMessage = '';
		globalThis.config = config;
		globalThis.utilities = utilities;
		globalThis.nodeCache = new NodeCache({ useClones: false, stdTTL: 43200 });

		utilities.Measure.start('database');
		globalThis.database = await Database.connect(true);
		utilities.Measure.end('database');

		utilities.Measure.start('client');
		globalThis.client = await Client.connect();
		utilities.Measure.end('client');

		utilities.Measure.start('commands');
		globalThis.command = new CommandHandler();
		for (const fn of fs.readdirSync(path.join('./lib/commands')))
			if (!fn.endsWith('d.ts') && fn.endsWith(process.env.NODE_ENV === 'production' ? 'js' : 'ts')) await import(`./commands/${fn}`);
		utilities.Measure.end('commands');

		utilities.Measure.end('run');
		return void 0;
	} catch (err) {
		throw err;
	}
})();
