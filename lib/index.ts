import { config } from 'dotenv';
import { logger, run } from './utilities';

try {
	config({
		path: './src/.env',
	});
	run();
} catch (e) {
	throw logger.error(e);
}
