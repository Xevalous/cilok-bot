import { exec } from 'child_process';

command.on(
	['>', '->'],
	['owner'],
	async (mess, { text, command }) => {
		const parse = command.includes('->') ? text.replace('->', 'return ') : text.replace('>', '');
		try {
			const evaluate = await eval(`;(async () => {${parse} })()`).catch((err: unknown) => {
				client.reply(mess, err as string);
			});
			return client.reply(mess, evaluate);
		} catch (err) {
			return client.reply(mess, err as string);
		}
	},
	{
		owner: '--noresp',
		wait: false,
		prefix: false,
	},
);

command.on(
	['$'],
	['owner'],
	async (mess, { query }) => {
		try {
			exec(`${query}`, (e, a) => {
				if (e) return client.reply(mess, `${e}`);
				client.reply(mess, a);
			});
			return void 0;
		} catch (err) {
			return client.reply(mess, err as string);
		}
	},
	{
		owner: '--noresp',
		wait: false,
		prefix: false,
	},
);

command.on(
	['setstatus'],
	['owner'],
	(mess, { query }) => {
		try {
			query = query.trim();
			if (query === '--reset') global.statusMessage = '';
			else global.statusMessage = query;
			return client.reply(mess, '*Success* | Berhasil mengubah status message');
		} catch (err) {
			return client.throw(mess, err, 'setstatus');
		}
	},
	{
		owner: '--noresp',
	},
);
