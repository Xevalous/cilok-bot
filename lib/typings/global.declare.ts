import Client from '../client';
import Command from '../command';

declare global {
	var config: typeof import('../../src/cilok.config.json');
	var util: typeof import('../utilities');
	var database: {
		[k: string]: any;
	};
	var client: Client;
	var command: Command;
}
