import { Proto } from './client.declare';

<<<<<<< HEAD
export namespace ICommandHandler {
	export interface Event extends AdditonalEvent {
		name: string;
		command: {
			string: string[];
			regExp: (string | RegExp)[];
		};
		tag: string[];
		help: string;
		index: number;
		callback: (mess: Proto, property: CommandProperty) => Promise<any> | any;
		prefix: boolean;
		enable: boolean;
	}
	export interface AdditonalEvent {
		/** Alternative commands will not appear in the menu, but it still can be executed */
		alternativeCommand?: (string | RegExp)[];
		mediaCustomReply?: string[] | string;
		wait?: boolean | string;
		query?: string;
		owner?: boolean | string;
		group?: boolean | string;
	}
	export interface CommandProperty {
		event: Event;
		text: string;
		query: string;
		command: string;
		commandWithQuery: string;
		prefix: string;
		modify: (event: Event) => Event;
	}
=======
export declare interface ICommand extends ICommandOptions {
	name: string;
	command: string[];
	commandEXP: (string | RegExp)[];
	tag: string[];
	help: string;
	index?: number;
	callback: (mess: IProto, call: ICommandContent) => Promise<any> | any;
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
	wait?: boolean | string;
	query?: string;
	owner?: boolean | string;
	group?: boolean | string;
>>>>>>> 6f7b9788bde00b8650952790b5877636250e90a1
}
