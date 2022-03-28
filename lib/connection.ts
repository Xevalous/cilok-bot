import pino from 'pino';
import Client from './client';
import { Boom } from '@hapi/boom';
import { writeFileSync } from 'fs';
import makeWASocket, { DisconnectReason, useSingleFileAuthState } from '@adiwajshing/baileys';

export default async function CreateConnection() {
	try {
		database.saveOn = database?.saveOn ?? 0;

		util.logger.info('Connecting to whatsapp server...');
		const { state, saveState } = useSingleFileAuthState('./src/database/session.json');
		const socket = makeWASocket({
			auth: state,
			printQRInTerminal: true,
			browser: ['cilok-v2-md', 'Desktop', '3.0.0'],
			version: await util.waVersion(),
			logger: pino({
				level: 'info',
			}),
		});

		socket.ev.on('connection.update', (condition) => {
			switch (condition.connection) {
				case 'open':
					util.logger.info('Connected to whatsapp server');
					break;
				case 'close':
					const statusCode = (condition.lastDisconnect?.error as Boom).output.statusCode;
					if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.restartRequired) {
						return CreateConnection();
					}
					break;
			}
		});

		socket.ev.on('creds.update', () => {
			saveState();
			const triggerSave = 10;
			if ((database.saveOn as number) === triggerSave) {
				database.saveOn = 0;
				util.logger.database('Saving database...');
				for (const a of Object.keys(database)) {
					writeFileSync(`./src/database/${a}.json`, JSON.stringify(database[a]));
				}
				return util.logger.database('Saving database complete');
			} else {
				database.saveOn++;
				return util.logger.info(`Saving database progress > ${database.saveOn} / ${triggerSave}`);
			}
		});

		return new Client(socket);
	} catch (e) {
		throw util.logger.format(e);
	}
}
