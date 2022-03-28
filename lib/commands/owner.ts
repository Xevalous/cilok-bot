import { exec } from 'child_process';

command.on(
	['>>', '=>>'],
	['owner'],
	async (mess, { text, command }) => {
		const parse = command.includes('=>>') ? text.replace('=>>', 'return ') : text.replace('>>', '');
		try {
			const evaluate = await eval(`;(async () => {${parse} })()`).catch((e: unknown) => {
				return client.reply(mess, e as string);
			});
			return client.reply(mess, evaluate);
		} catch (e) {
			return client.reply(mess, e as string);
		}
	},
	{
		owner: '--noresp',
		wait: false,
		prefix: false,
	},
);

command.on(
	['$$'],
	['owner'],
	async (mess, { query }) => {
		try {
			exec(`${query}`, (e, a) => {
				if (e) return client.reply(mess, `${e}`);
				client.reply(mess, a);
			});
		} catch (e) {
			return client.reply(mess, e as string);
		}
	},
	{
		owner: '--noresp',
		wait: false,
		prefix: false,
	},
);
