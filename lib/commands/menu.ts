import _ from 'lodash';

command.on(
	['menu', 'help'],
	['hidden'],
	(mess) => {
		try {
			const menuList: ButtonConfig[] = [];
			for (const a of Object.keys(command.tag))
				if (!['owner', 'hidden'].includes(a))
					menuList.push({
						title: config.unicode.dash.repeat(30),
						listTitle: `${a[0].toUpperCase() + a.slice(1).toLowerCase()} menu`,
						value: `!${a}menu`,
					});
			return client.sendButton(
				mess,
				{
					text: 'Berikut adalah list menu yang tersedia',
					footer: 'Made with ♡ by VEXG',
					buttonText: 'Klik untuk melihat',
					quoted: mess,
				},
				menuList,
			);
		} catch (err) {
			return client.throw(mess, err, 'menuList');
		}
	},
	{
		wait: false,
	},
);

command.on(
	[/^(?!menu)[a-z]{0,20}(menu)/i],
	['hidden'],
	(mess, { prefix, command }) => {
		try {
			const tagKey: string = command.split('menu')[0].toLowerCase();
			if (!global.command.tag[tagKey]) return;
			if (['owner', 'hidden'].includes(tagKey) && !mess.validator.isOwner) return client.reply(mess, config.response.owner); // only owner can access this menu
			let getCommand: string[] = [],
				commandList = `${utilities.wings(`${tagKey[0].toUpperCase() + tagKey.slice(1).toLowerCase()} menu`)}`;
			for (const a in global.command.tag[tagKey])
				if (global.command.tag[tagKey][a].enable)
					getCommand = getCommand.concat(
						(global.command.tag[tagKey][a].prefix ? prefix : '') +
							_.difference(global.command.tag[tagKey][a].command.string, global.command.tag[tagKey][a].alternativeCommand ?? []),
					);
			for (const a of getCommand.sort())
				if (a.includes(',')) {
					for (const b of a.split(',')) commandList += `\n${config.unicode.bullet} ${prefix}${b.replace(prefix, '')}`;
				} else {
					commandList += `\n${config.unicode.bullet} ${a}`;
				}
			return client.sendButton(
				mess,
				{
					text: commandList.trim(),
					footer: 'Made with ♡ by VEXG',
					quoted: mess,
				},
				[],
			);
		} catch (err) {
			return client.throw(mess, err, 'section menu');
		}
	},
	{
		wait: false,
	},
);

command.on(['bugreport'], ['hidden'], async (mess, { query }) => {
	try {
		await client.sendMessage(`${config.ownerNumber[0]}@s.whatsapp.net`, {
			text: `${utilities.wings('Bug report')}\n${utilities.parseJSON({
				dari: `wa.me/${mess.sender.jid?.replace(/:/g, '').split('@')[0]}`,
				pesan: query.trim(),
			})}` as string,
		});
		await client.reply(mess, '*SENDED* | Terimakasih, pesan sudah terkirim ke owner');
		return client.reply(mess, '*ALERT* | Jika mengirim pesan bugreport dengan tujuan iseng maka akan di block');
	} catch (err) {
		return client.throw(mess, err, 'bugreport');
	}
});
