import _ from 'lodash';
import { proto } from '@adiwajshing/baileys';
import { EventParser, ICommandHandler, Metadata } from './typings';

export default class CommandHandler {
	commandList: ICommandHandler.Event[];
	tag: Record<string, ICommandHandler.Event[]>;
	prefix: RegExp[];
	constructor() {
		this.commandList = [];
		this.tag = {};
		this.prefix = config.prefix.map((v) => (typeof v === 'string' ? new RegExp(`^(${utilities.parseRegex(v)})`, 'i') : v));
	}

	public on = (
		command: (string | RegExp)[],
		tag: string[],
		callback: (mess: Metadata, property: ICommandHandler.CommandProperty) => Promise<any> | any,
		commandConfig?: ICommandHandler.AdditonalEvent | ICommandHandler.Event,
	): void => {
		const event: ICommandHandler.Event = {
			name: command.map((v) => (typeof v === 'string' ? v : v.toString())).join('/'),
			command: {
				string: _.concat(command, commandConfig?.alternativeCommand ?? []).map((v) => (typeof v === 'string' ? v : v.toString())),
				regExp: _.concat(command, commandConfig?.alternativeCommand ?? []).map((v) =>
					typeof v === 'string' ? new RegExp(`^(${utilities.parseRegex(v)})`, 'i') : v,
				),
			},
			tag,
			help: undefined,
			wait: true,
			prefix: true,
			enable: true,
			index: null,
			callback,
			...commandConfig,
		};

		for (const k of tag) {
			this.tag[k] = this.tag[k] ? this.tag[k] : [];
			this.tag[k].push(event);
		}

		event.index = this.commandList.length;
		this.commandList.push(event);
	};

	public emit = (mess: Metadata) => {
		const event = this.getCommand(_.deburr(mess.string));
		try {
			if (!event) return;
			const access = this.getAccess(mess, event);
			if (access === 200) {
				event.instance.callback(mess, {
					...event,
				});
				return event;
			}
			return void 0;
		} catch (err) {
			throw err;
		}
	};

	private action = (
		mess: Metadata,
		event: string | string[] | boolean,
		responseKey: string,
		additonal?: {
			prefix?: string;
			command?: string;
		},
	): Promise<proto.WebMessageInfo | undefined> | void => {
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
				const possiblyArray = ['mediaCustomReply', 'quotedCustom'];
				let result = '';
				if (possiblyArray.includes(responseKey)) {
					const length = resultResponse.length;
					result = config.response[responseKey as keyof typeof config.response];
					if (Array.isArray(resultResponse) && length > 1)
						resultResponse.forEach((v, i) => {
							if (i === length - 1) result += `dan ${v}`;
							else result += ` ${v}, `;
						});
					else result += ` ${resultResponse}`;
				} else if (!Array.isArray(resultResponse)) {
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

	private getAccess = (mess: Metadata, event: ICommandHandler.CommandProperty): void | Promise<proto.WebMessageInfo | undefined> | 200 => {
		const eventType = event.instance;
		let CONFIG!: [string | string[] | boolean, string];

		if (eventType.query && event.query.trim().length < 1) CONFIG = [eventType.query, 'query'];
		if (eventType.group && !mess.validator.isGroup) CONFIG = [eventType.group, 'group'];
		if (eventType.owner && !mess.validator.isOwner) CONFIG = [eventType.owner, 'owner'];
		if (eventType.url && !utilities.url(event.query).isValid) CONFIG = [eventType.url, 'url'];
		if (eventType.quoted && !mess.quoted) CONFIG = [eventType.quoted, 'quoted'];
		if (eventType.media && !(mess.quoted?.validator.message.isMedia ?? mess.validator.message.isMedia)) CONFIG = [eventType.media, 'media'];
		if (
			eventType.group &&
			typeof mess.groupMetadata?.participants.find((v) => v.id.normalizeJid() === mess.sender.jid?.normalizeJid())?.admin !== 'string'
		)
			CONFIG = [eventType.admin!, 'admin'];
		if (
			eventType.group &&
			typeof mess.groupMetadata?.participants.find((v) => v.id.normalizeJid() === mess.client.jid.normalizeJid())?.admin !== 'string'
		)
			CONFIG = [eventType.admin!, 'clientAdminRequired'];

		if (
			eventType.mediaCustomReply &&
			!(eventType.mediaCustomReply instanceof Array
				? eventType.mediaCustomReply.some((v) => v in client.messageType && client.messageType[v] === (mess.quoted?.type[1] ?? mess.type[1]))
				: eventType.mediaCustomReply in client.messageType &&
				  client.messageType[eventType.mediaCustomReply] === (mess.quoted?.type[1] ?? mess.type[1]))
		)
			CONFIG = [eventType.mediaCustomReply, 'mediaCustomReply'];
		if (
			eventType.quotedCustom &&
			!(eventType.quotedCustom instanceof Array
				? eventType.quotedCustom.some((v) => v in client.messageType && client.messageType[v] === mess.quoted?.type[1])
				: eventType.quotedCustom in client.messageType && client.messageType[eventType.quotedCustom] === mess.quoted?.type[1])
		)
			CONFIG = [eventType.quotedCustom, 'quotedCustom'];

		if (typeof CONFIG === 'object' && CONFIG.length > 0) {
			return this.action(mess, CONFIG[0], CONFIG[1], {
				prefix: event.prefix,
				command: event.command,
			});
		}

		if (eventType?.wait) this.action(mess, eventType.wait, 'wait');
		return 200;
	};

	private getCommand = (text: string) => {
		const eventParser = (event: ICommandHandler.Event): EventParser | undefined => {
			const prefix: RegExp | undefined = event.prefix
					? this.prefix.filter((v) => v.test(text)).sort((a, b) => b.toString().length - a.toString().length)[0]
					: /^()/i,
				index = event.index!,
				commandWithQuery = text.replace(prefix, ''),
				command = event.command.regExp.find((v) => v.test(commandWithQuery))?.exec(commandWithQuery);
			if (!prefix || !command) return undefined;
			return { prefix, index, commandWithQuery, command: (command as RegExpExecArray)[0] };
		};

		const parser: EventParser[] = [];
		let instance: ICommandHandler.Event | ICommandHandler.Event[] = this.commandList.filter((v) => {
			const validEvent = eventParser(v);
			if (validEvent) parser.push(validEvent);
			return v.enable && validEvent;
		});
		const parsedEvent = parser.find(
			(v) =>
				v.command ===
				utilities.closest(
					text,
					parser.map((v) => v.command),
				),
		);
		if (!parsedEvent || !instance) return undefined;
		instance = instance.find((v) => v.index === parsedEvent.index)!;
		return {
			instance,
			text,
			command: parsedEvent.command,
			commandWithQuery: parsedEvent.commandWithQuery,
			query: parsedEvent.commandWithQuery.replace(parsedEvent.command, '').trim(),
			prefix: parsedEvent.prefix.exec(text)![0],
			modify: (property: ICommandHandler.Event) => {
				_.assign(this.commandList[(instance as typeof property).index!], property);
				return this.commandList[(instance as typeof property).index!];
			},
		};
	};
}
