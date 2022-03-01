client.socket.ev.on('messages.upsert', async (upsert) => {
	if (
		!Object.keys(upsert.messages[0]).includes('message') ||
		!Object.keys(upsert.messages[0]).includes('key')
	) {
		return;
	}
	const mess = await client.metadata(upsert.messages[0]);
	if (mess.key.id!.length < 20 || mess.key.remoteJid === 'status@broadcast') {
		return;
	}

	if (mess.isGroup) {
		if (!database.group) database.group = {};
		if (!database.group[mess.from!]) {
			database.group[mess.from!] = { subject: mess.groupData?.subject };
		}
		if (database.group[mess.from!].isMuted) return;
	}
	if (!client.chats[mess.from!]) {
		client.chats[mess.from!] = { messages: {} };
	}
	client.chats[mess.from!].messages[mess.id!] = mess;
	database.chats = client.chats;
	command.emit(mess);
});
