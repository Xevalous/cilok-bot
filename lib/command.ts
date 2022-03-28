import { proto } from '@adiwajshing/baileys';
import { Proto } from './typings/client.declare';
import { ICommandHandler } from './typings/command.declare';

export default class CommandHandler {
	commandList: ICommandHandler.Event[];
	tag: { [k: string]: ICommandHandler.Event[] };
	prefix: (string | RegExp)[];
	constructor() {
		this.commandList = [];
		this.tag = {};
		this.prefix = config.prefix.map((a) => ((a as String) instanceof RegExp ? a : new RegExp(`^(${util.parseRegex(a)})`, 'i')));
	}

	public on = (
		command: (string | RegExp)[],
		tag: string[],
		callback: (mess: Proto, property: ICommandHandler.CommandProperty) => Promise<any> | any,
		additonal?: ICommandHandler.AdditonalEvent | ICommandHandler.Event,
	): void => {
		const ev: ICommandHandler.Event = {
			name: (command as string[])[0].toString(),
			command: {
				string: (command as string[]).map((a) => a, toString()),
				regExp: (command as string[]).map((a) => ((a as any) instanceof RegExp ? a : new RegExp(`^(${util.parseRegex(a)})`, 'i'))),
			},
			tag,
			help: 'Tidak ada informasi bantuan!',
			wait: true,
			prefix: true,
			enable: true,
			index: 0,
			callback,
			...additonal,
		};

		for (const a of tag) {
			this.tag[a] = this.tag[a] ? this.tag[a] : [];
			this.tag[a].push(ev);
		}
		ev.command.regExp = ev.command.regExp.concat(
			((additonal?.alternativeCommand ?? []) as string[]).map((a) =>
				(a as any) instanceof RegExp ? a : new RegExp(`^(${util.parseRegex(a)})`, 'i'),
			),
		);
		ev.index = this.commandList.length;
		this.commandList.push(ev);
	};

	public emit = (mess: Proto): void => {
		const ev = this.getCommand(mess.string);
		try {
			if (!('event' in ev)) return;
			const access = this.getAccess(mess, ev);
			if (access === 200)
				ev.event.callback(mess, {
					...ev,
				});
		} catch (e) {
			throw util.logger.format(e);
		}
	};

	private action = (
		mess: Proto,
		event: string | string[] | boolean,
		responseKey: string,
		additonal?: {
			prefix?: string;
			command?: string;
		},
	): Promise<proto.WebMessageInfo> | void => {
		const resultResponse =
			typeof event === 'boolean'
				? config.response[responseKey as keyof typeof config.response]
				: event.includes('?>') && !(event instanceof Array)
				? `${config.response[responseKey as keyof typeof config.response]} ${event.split('?>')[1]}`
				: event;
		if (resultResponse === '--noresp') return;
		return client.reply(
			mess,
			(() => {
				const possiblyArray = ['mediaCustomReply'];
				let result = '';
				if (possiblyArray.includes(responseKey)) {
					const length = resultResponse.length;
					switch (responseKey) {
						case 'mediaCustomReply':
							result = config.response.mediaCustomReply;
							if (resultResponse instanceof Array && length > 1)
								resultResponse.forEach((a, b) => {
									if (b === length - 1) result += `dan ${a}`;
									else result += ` ${a}, `;
								});
							else result += ` ${resultResponse}`;
							break;
					}
				} else if (!(resultResponse instanceof Array)) {
					result =
						resultResponse.trim() +
						(() => {
							if (!['owner', 'wait'].includes(responseKey))
								if (['query'].includes(responseKey) || resultResponse.includes('</helpcmd>')) return config.response.help;
							return '';
						})();
				}
				return result;
			})()!
				.replace('</prefix>', additonal?.prefix ?? '')
				.replace('</command>', additonal?.command ?? ''),
		);
	};

	public getAccess = (mess: Proto, event: ICommandHandler.CommandProperty): void | Promise<proto.WebMessageInfo> | 200 => {
		let CONFIG!: [string | string[] | boolean, string];

		if (event.event?.query && event.query.length === 0) CONFIG = [event.event.query!, 'query'];
		if (event.event?.group && !mess.validator.isGroup) CONFIG = [event.event.group!, 'group'];
		if (event.event?.owner && !mess.validator.isOwner) CONFIG = [event.event.owner!, 'owner'];
		if (
			event.event?.mediaCustomReply &&
			!(event.event.mediaCustomReply instanceof Array
				? event.event.mediaCustomReply.some((a) => a in client.messageType && client.messageType[a] === (mess.quotedMess?.type[1] ?? mess.type[1]))
				: event.event.mediaCustomReply in client.messageType &&
				  client.messageType[event.event.mediaCustomReply] === (mess.quotedMess?.type[1] ?? mess.type[1]))
		)
			CONFIG = [event.event.mediaCustomReply, 'mediaCustomReply'];

		if (typeof CONFIG === 'object' && CONFIG.length > 0) {
			return this.action(mess, CONFIG[0], CONFIG[1], {
				prefix: event.prefix,
				command: event.command,
			});
		}

		if (event.event?.wait) this.action(mess, event.event.wait as boolean | string, 'wait');
		return 200;
	};

	private getCommand = (text: string): ICommandHandler.CommandProperty | {} => {
		let ev: ICommandHandler.CommandProperty = {} as ICommandHandler.CommandProperty;
		for (const a of this.commandList) {
			if (!a.enable) continue;
			const prefix = a.prefix
				? this.prefix.filter((a) => (a as RegExp).test(text)).sort((a, b) => b.toString().length - a.toString().length)[0]
				: /^()/i;
			if (!prefix) continue;
			const commandWithQuery = text.replace(prefix, '');
			const commandValidator = a.command.regExp.filter((a) => (a as RegExp).test(commandWithQuery))[0];
			if (!commandValidator) continue;
			ev = {
				event: a,
				text,
				command: (commandValidator as RegExp).exec(commandWithQuery)![0].toLowerCase(),
				commandWithQuery,
				query: commandWithQuery.replace(commandValidator, '').trim(),
				prefix: (prefix as RegExp).exec(text)![0],
				modify: (property: ICommandHandler.Event) => {
					this.commandList[ev.event.index] = {
						...this.commandList[ev.event.index],
						...property,
					};
					return this.commandList[ev.event.index];
				},
			};
		}
		return ev;
	};
}
