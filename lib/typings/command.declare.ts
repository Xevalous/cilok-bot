import { IProto } from './client.declare';

export declare interface ICommand extends ICommandOptions {
	name: string;
	command: string[];
	commandEXP: (string | RegExp)[];
	tag: string[];
	help: string;
	index?: number;
	callback: (
		mess: IProto,
		call: ICommandContent & {
			client: typeof global.client;
			util: typeof import('../utilities');
			config: typeof global.config;
		},
	) => Promise<any> | any;
	prefix: boolean;
	enable: boolean;
}

export declare interface ICommandContent {
	event:
		| ICommand
		| {
				noPrefix: string;
				noPrefix_lower: string;
				prefix: string | RegExp;
				length: number;
				matched: string | RegExp;
		  };
	text: string;
	query: string;
	command: string;
	prefix: string;
	modify: (property: ICommand) => ICommand;
}

declare interface ICommandOptions {
	owner?: boolean | string;
}
