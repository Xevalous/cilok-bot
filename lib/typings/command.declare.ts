import { Proto } from './client.declare';

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
}
