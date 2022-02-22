import { exec } from 'child_process';

global.command.on(
	['>>', '=>>'],
	['owner'],
	async (mess, { client, text, command }) => {
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
		owner: true,
		prefix: false,
	},
);

global.command.on(
	['$$'],
	['owner'],
	async (mess, { client, query }) => {
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
		prefix: false,
	},
);
