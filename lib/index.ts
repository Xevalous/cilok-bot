import { config } from 'dotenv';
import { schedule } from 'node-cron';
import { logger, run } from './utilities';
import { existsSync, rmdirSync } from 'fs';

try {
	config({
		path: './src/.env',
	});
	schedule('*/10 * * * *', () => {
		if (existsSync('temp')) {
			rmdirSync('./temp', {
				recursive: true,
			});
		}
	});
	run();
} catch (e) {
	throw logger.format(e);
}
