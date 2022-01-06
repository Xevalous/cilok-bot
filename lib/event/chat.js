/* global client, database, functions, config, cmd */

client.ev.on('messages.upsert', async (chat) => {
    try {
        if (
            !Object.keys(chat.messages[0]).includes('message') ||
            !Object.keys(chat.messages[0]).includes('key')
        ) {
            return;
        }
        const msg = await functions.metadataMsg(client, chat.messages[0]);
        if (
            msg.key.id.length < 20 ||
            msg.key.remoteJid === 'status@broadcast'
        ) {
            return;
        }
        if (msg.isGroup) {
            if (!database.group) database.group = {};
            if (!database.group[msg.from]) {
                database.group[msg.from] = { subject: msg.groupData.subject };
            }
            if (database.group[msg.from].mute) return;
        }
        if (!client.chat[msg.from]) client.chat[msg.from] = { messages: {} };
        client.chat[msg.from].messages[msg.id] = msg;
        database.chat = client.chat;
        cmd.emit(msg);
    } catch (e) {
        if (!String(e).includes('this.isZero')) {
            console.log(functions.util.format(e));
            client.sendMessage(
                config.ownerNumber[0] + '@s.whatsapp.net',
                functions.util.format(e),
                'conversation'
            );
        }
    }
});
