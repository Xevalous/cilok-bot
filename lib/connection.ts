import pino from 'pino';
import Client from './client';
import { Boom } from '@hapi/boom';
import { writeFileSync } from 'fs';
import makeWASocket, { DisconnectReason, useSingleFileAuthState } from '@adiwajshing/baileys';

export default async function CreateConnection() {
	try {
		global.database.saveOn = global.database?.saveOn ?? 0;

		global.util.logger.info('Connecting to whatsapp server...');
		const { state, saveState } = useSingleFileAuthState('./src/database/session.json');
		const socket = makeWASocket({
			auth: state,
			printQRInTerminal: true,
			browser: ['cilok-v2-md-debug-ts', 'Desktop', '2.0.1'],
			version: await global.util.waVersion(),
			logger: pino({
				level: 'info',
			}),
		});

		socket.ev.on('connection.update', (condition) => {
			switch (condition.connection) {
				case 'open':
					global.util.logger.info('Connected to whatsapp server');
					break;
				case 'close':
					const statusCode = (condition.lastDisconnect?.error as Boom).output.statusCode;
					if (
						statusCode === DisconnectReason.loggedOut ||
						statusCode === DisconnectReason.restartRequired
					) {
						return CreateConnection();
					}
			}
		});

		socket.ev.on('creds.update', () => {
			saveState();
			const triggerSave = 10;
			if ((global.database.saveOn as number) === triggerSave) {
				global.database.saveOn = 0;
				global.util.logger.database('Saving database...');
				for (const a of Object.keys(global.database)) {
					writeFileSync(`./src/database/${a}.json`, JSON.stringify(global.database[a]));
				}
				return global.util.logger.database('Saving database complete');
			} else {
				global.database.saveOn++;
				return global.util.logger.info(
					`Saving database progress > ${global.database.saveOn} / ${triggerSave}`,
				);
			}
		});

		return new Client(socket);
	} catch (e) {
		throw global.util.logger.error(e);
	}
}
