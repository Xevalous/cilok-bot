import { Metadata } from './metadata';

export namespace ICommandHandler {
	export interface Event extends AdditonalEvent {
		name: string;
		command: {
			string: string[];
			regExp: RegExp[];
		};
		tag: string[];
		help?: string;
		index: number | null;
		callback: (mess: Metadata, property: CommandProperty) => Promise<any> | any;
		prefix: boolean;
		enable: boolean;
	}
	export interface AdditonalEvent {
		/** Alternative commands will not appear in the menu, but it still can be executed */
		alternativeCommand?: (string | RegExp)[];
		mediaCustomReply?: string[] | string;
		quotedCustom?: string[] | string;
		quoted?: boolean;
		url?: boolean;
		admin?: boolean;
		clientAdminRequired?: boolean;
		query?: string;
		wait?: boolean | string;
		owner?: boolean | string;
		group?: boolean | string;
		media?: boolean | string;
	}
	export interface CommandProperty {
		instance: Event;
		text: string;
		query: string;
		command: string;
		commandWithQuery: string;
		prefix: string;
		modify: (event: Event) => Event;
	}
}

export interface EventParser {
	prefix: RegExp;
	index: number;
	commandWithQuery: string;
	command: string;
}
