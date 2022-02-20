import Client from '../client';
import config from '../../src/cilok.config.json';
import Command from '../command';

type IConfig = typeof config;

export type ValueOf<T> = T[keyof T];

declare global {
	var config: IConfig;
	var util: typeof import('../utilities');
	var database: {
		[k: string]: any;
	};
	var client: Client;
	var command: Command;
}
