/* global client, database, util, config, cmd */

client.ev.on('messages.upsert', async (chat) => {
    try {
        if (
            !Object.keys(chat.messages[0]).includes('message') ||
            !Object.keys(chat.messages[0]).includes('key')
        ) {
            return;
        }
        const msg = await util.metadataMsg(client, chat.messages[0]);
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
        if (!client.chats[msg.from]) client.chats[msg.from] = { messages: {} };
        client.chats[msg.from].messages[msg.id] = msg;
        database.chats = client.chats;
        cmd.emit(msg);
    } catch (e) {
        if (!String(e).includes('this.isZero')) {
            console.log(util.format(e));
            client.sendMessage(
                config.ownerNumber[0] + '@s.whatsapp.net',
                util.format(e),
                'conversation'
            );
        }
    }
});
