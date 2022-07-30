import _ from 'lodash';
import path from 'path';
import Client from './client';
import metadata from './metadata';
import { Boom } from '@hapi/boom';
import { schedule } from 'node-cron';
import { BinaryNode } from '@adiwajshing/baileys';
import * as fs from 'fs';

export async function eventHandler(client: Client) {
	client.socket.ev.on('creds.update', () => client.auth.saveState());

	client.socket.ev.on('connection.update', (condition) => {
		switch (condition.connection) {
			case 'open':
				utilities.logger('info', 'Connected to whatsapp');
				break;
			case 'close':
				const statusCode = (condition.lastDisconnect?.error as Boom).output.statusCode;
				if (statusCode !== client.baileys.DisconnectReason.loggedOut) Client.connect();
				else process.exit();
				break;
		}
	});

	client.socket.ev.on('messages.upsert', async (ev) => {
		if (!Object.keys(ev.messages[0]).includes('message') || !Object.keys(ev.messages[0]).includes('key')) return;

		if (!database.storage?.chats) database.storage.chats = {};
		if (!database.storage?.chatsId) database.storage.chatsId = [];

		const mess = await metadata(ev.messages[0]);
		if (mess.type[0] === 'protocolMessage') client.socket.ev.emit('messages.delete', { keys: [mess.message?.protocolMessage?.key!] });
		if (mess.key.id!.length < 20 || mess.from === 'status@broadcast') return;

		nodeCache.set(mess.key.id!, mess);
		// TODO: Remove isGroup validator
		if (!_.has(database.storage.chats, mess.from!) && mess.validator.isGroup) database.storage.chats[mess.from!] = {};
		if (!database.storage.chatsId.includes(mess.from)) database.storage.chatsId.push(mess.from);

		return Promise.all([client.socket.readMessages([mess.key]), command.emit(mess)]);
	});

	client.socket.ev.on('groups.update', async (ev) => {
		if (database.storage.chats[ev[0].id!]) database.storage.chats[`${ev[0].id}`].groupMetadata = await client.socket.groupMetadata(ev[0].id!);
	});

	client.socket.ev.on('group-participants.update', async (ev) => {
		if (database.storage.chats[ev.id]) database.storage.chats[`${ev.id}`].groupMetadata = await client.socket.groupMetadata(ev.id);
	});

	client.socket.ws.on('CB:call,,offer', async (ev: BinaryNode) => {
		const caller = ev.attrs.from;
		if (config.ownerNumber.includes(caller.split('@')[0])) return;
		await client.sendMessage(caller, {
			text: '*BLOCKED* | Anda telah di block karena menelepon cilok',
		});
		await utilities.delay(550);
		return client.socket.updateBlockStatus(caller, 'block');
	});

	return void 0;
}

export function scheduleHandler() {
	const tempSchedule = schedule('*/1.2 * * * *', () => {
		return fs.readdir(config.path.temp, (err, f) => {
			if (err) throw err;
			if (f.length > 1)
				f.forEach((v) => {
					if (v !== '.nomedia') fs.unlinkSync(path.join(config.path.temp, v));
				});
		});
	});
	fs.watch(config.path.temp, (e) => {
		if (e === 'rename') {
			tempSchedule.stop();
			tempSchedule.start();
		}
	});

	schedule('*/15 * * * *', () => Promise.all([database.save(), utilities.Measure.memoryUsage() > 100 ? nodeCache.flushAll() : void 0]));
}
