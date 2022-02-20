global.client.socket.ev.on('messages.upsert', async (upsert) => {
	if (
		!Object.keys(upsert.messages[0]).includes('message') ||
		!Object.keys(upsert.messages[0]).includes('key')
	) {
		return;
	}
	const mess = await global.client.metadata(upsert.messages[0]);
	if (mess.key.id!.length < 20 || mess.key.remoteJid === 'status@broadcast') {
		return;
	}

	if (mess.isGroup) {
		if (!global.database.group) global.database.group = {};
		if (!global.database.group[mess.from!]) {
			global.database.group[mess.from!] = { subject: mess.groupData?.subject };
		}
		if (global.database.group[mess.from!].isMuted) return;
	}
	if (!global.client.chats[mess.from!]) {
		global.client.chats[mess.from!] = { messages: {} };
	}
	global.client.chats[mess.from!].messages[mess.id!] = mess;
	global.database.chats = global.client.chats;
	global.command.emit(mess);
});
