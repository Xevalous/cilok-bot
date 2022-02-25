import { proto } from '@adiwajshing/baileys';
import { IProto } from './typings/client.declare';
import { ICommand, ICommandContent } from './typings/command.declare';

export default class Command {
	commandList: ICommand[];
	tag: { [k: string]: ICommand[] };
	prefix: (string | RegExp)[];
	command: any;
	constructor() {
		this.commandList = [];
		this.tag = {};
		this.prefix = global.config.prefix.map((a) =>
			(a as any) instanceof RegExp ? a : new RegExp(`^(${global.util.parseRegex(a)})`, 'i'),
		);
	}

	public on = (
		command: string[],
		tag: string[],
		callback: (
			mess: IProto,
			call: ICommandContent & {
				client: typeof global.client;
				util: typeof import('./utilities');
				config: typeof global.config;
			},
		) => Promise<any> | any,
		options?: object,
	): void => {
		const EV: ICommand = {
			name: command[0].toString(),
			command: command.map((a) => a, toString()),
			commandEXP: command.map((a) =>
				(a as any) instanceof RegExp ? a : new RegExp(`^(${global.util.parseRegex(a)})`, 'i'),
			),
			tag,
			help: 'Tidak ada informasi bantuan!',
			prefix: true,
			callback,
			enable: true,
			...options,
		};

		for (const a of tag) {
			this.tag[a] = this.tag[a] ? this.tag[a] : [];
			this.tag[a].push(EV);
		}

		EV.index = this.commandList.length;
		this.commandList.push(EV);
	};

	public emit = (mess: IProto): void => {
		const EV = this.getCommand(mess.string) as ICommandContent;
		try {
			if (!EV.event) return;
			const access = this.getAccess(mess, EV);
			if (access === 200) {
				(EV.event as ICommand).callback(mess, {
					...EV,
					client: global.client,
					util: global.util,
					config: global.config,
				});
			}
		} catch (e) {
			throw global.util.logger.error(e);
		}
	};

	private action = (
		mess: IProto,
		event: string | boolean,
		responseKey: string,
		prefix?: string,
	): proto.WebMessageInfo | void => {
		const resultResponse =
			typeof event === 'boolean'
				? (global.config.response as Record<string, string[] | string | number>)[responseKey]
				: event.includes('?>')
				? `${(global.config.response as Record<string, string[] | string | number>)[responseKey]} ${
						event.split('?>')[1]
				  }`
				: event;
		if (resultResponse === '--noresp') return;
		global.client.reply(
			mess,
			(!['wait'].includes(responseKey)
				? resultResponse +
				  (['owner'].includes(responseKey)
						? prefix
							? global.config.response.help.replace('</prefix>', prefix)
							: ''
						: '')
				: resultResponse) as string,
		);
	};

	public getAccess = (mess: IProto, event: ICommandContent): proto.WebMessageInfo | 200 | void => {
		const EV = event.event;
		let CONFIG!: [string | boolean, string];

		if (!((EV as ICommand)?.owner && mess.isOwner)) CONFIG = [(EV as ICommand).owner!, 'owner'];

		if (!((EV as ICommand)?.group && mess.isGroup)) CONFIG = [(EV as ICommand).group!, 'group'];

		if (typeof CONFIG === 'object' && CONFIG.length > 0)
			return this.action(mess, CONFIG[0], CONFIG[1], event.prefix);

		return 200;
	};

	private getCommand = (key: string): ICommandContent | {} => {
		const content: ICommandContent = {} as ICommandContent;
		const command = [];

		for (const a of this.commandList) {
			if (!a.enable) continue;
			const prefix = a.prefix
				? this.prefix
						.filter((a) => (a as RegExp).test(key))
						.sort((a, b) => b.toString().length - a.toString().length)[0]
				: /^()/i;
			if (!prefix) continue;
			const noPrefix = key.replace(prefix, '');
			const noPrefix_lower = noPrefix.toLowerCase();
			const b = a.commandEXP
				.filter((a) => (a as RegExp).test(noPrefix_lower))
				.sort((a, b) => b.toString().length - a.toString().length)[0];
			if (!b) continue;
			command.push({
				...a,
				noPrefix,
				noPrefix_lower,
				prefix,
				length: b.toString().length,
				matched: b,
			});
		}

		if (command.length === 0) return {};
		content.event = command.sort((a, b) => b.length - a.length)[0];
		content.text = key;
		content.query = content.event.noPrefix.replace(content.event.matched, '').trim();
		content.command = content.event.noPrefix
			.replace(content.query.toLowerCase(), '')
			.trim()
			.toLowerCase();
		content.prefix = key.toLowerCase().split(content.command)[0];
		content.modify = (property: ICommand) => {
			this.commandList[(content.event as ICommand).index!] = {
				...this.commandList[(content.event as ICommand).index!],
				...property,
			};
			return this.commandList[(content.event as ICommand).index!];
		};
		return content;
	};
}
