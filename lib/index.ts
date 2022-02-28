import { config } from 'dotenv';
import { existsSync, rmdirSync } from 'fs';
import { schedule } from 'node-cron';
import { logger, run } from './utilities';

try {
	config({
		path: './src/.env',
	});
	schedule('*/10 * * * *', () => {
		if (existsSync('tmp')) {
			rmdirSync('./tmp', {
				recursive: true,
			});
		}
	});
	run();
} catch (e) {
	throw logger.format(e);
}
