import P from 'pino';
import path from 'path';
import core from 'file-type/core';
import axios from 'axios';
import Ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import { Agent } from 'https';
import { Readable } from 'form-data';
import { fromBuffer } from 'file-type';
import { eventHandler, scheduleHandler } from './event';
import { ButtonConfig, Content, GetBuffer, Metadata } from './typings';
import * as fs from 'fs';
import makeWASocket, * as baileys from '@adiwajshing/baileys';
import axiosRetry from 'axios-retry';

export default class Client {
	private static instance: Client;
	private static socket: baileys.WASocket;
	public readonly auth: ReturnType<typeof baileys.useSingleFileAuthState>;
	public readonly messageType: Record<string, string>;
	private constructor() {
		this.auth = baileys.useSingleFileAuthState(path.join(config.path.database, 'session.json'));
		this.messageType = Object.fromEntries(
			Object.keys(baileys.proto)
				.filter((a) => a.endsWith('Message') || a.includes('Conversation'))
				.map((a) => {
					const type = a[0].toLowerCase() + a.slice(1);
					return [type.replace('conversation', 'text').replace('Message', ''), type];
				}),
		);
	}

	public static async connect() {
		try {
			if (!Client.instance) Client.instance = new Client();
			utilities.logger('info', 'Connecting to whatsapp...');
			Client.socket = makeWASocket({
				auth: Client.instance.auth.state,
				printQRInTerminal: true,
				version: (await baileys.fetchLatestBaileysVersion()).version,
				browser: ['cilok-bot', 'Desktop', '3.1.0'],
				logger: P({
					level: 'info', //process.env.NODE_ENV === 'dev' ? 'info' : 'silent',
				}),
			});
			Promise.all([eventHandler(Client.instance), scheduleHandler()]);
			return Client.instance;
		} catch (err) {
			throw err;
		}
	}

	public get baileys() {
		return baileys;
	}
	public get socket(): baileys.WASocket {
		return Client.socket;
	}

	public async sendMessageFromContent(mess: Metadata, content: baileys.WAProto.IMessage & baileys.MessageGenerationOptionsFromContent) {
		try {
			const generatedContent = this.baileys.generateWAMessageFromContent(typeof mess === 'object' ? mess.from! : mess, content, content);
			await this.socket.relayMessage(generatedContent.key.remoteJid!, generatedContent.message!, {
				messageId: generatedContent.key.id!,
			});
			return generatedContent;
		} catch (err) {
			throw err;
		}
	}

	public async sendMessage(mess: Metadata | string, content: Content): Promise<baileys.proto.WebMessageInfo | undefined> {
		try {
			let property: Record<string, any> = content;

			const mediaType = Object.keys(property).find((v) => ['document', 'video', 'audio', 'image', 'sticker'].includes(v));
			if (!(typeof property[mediaType as keyof baileys.AnyMessageContent] === 'object') && mediaType) {
				const bufferData = await this.getBuffer(property[mediaType as keyof baileys.AnyMessageContent]);

				if (mediaType === 'image') {
					(property.caption as string) = property?.text ? property.text : property?.caption ? property.caption : '';
					delete property?.text;
				}

				property = {
					mimetype: (property?.mimetype ? property.mimetype : mediaType === 'audio' ? 'audio/mpeg' : bufferData.mime) as string,
					fileName: (!property?.filename
						? `${Date.now()}.${bufferData.ext}`
						: property?.filename.includes('.')
						? property.filename
						: `${property.filename}.${bufferData.ext}`) as string,
					...property,
					[mediaType]: bufferData.buffer,
				};
			}

			return this.socket.sendMessage(
				typeof mess === 'object' ? mess.from! : mess,
				property as baileys.AnyMessageContent,
				property as baileys.MiscMessageGenerationOptions,
			);
		} catch (err) {
			throw err;
		}
	}

	public async sendButton(mess: Metadata, content: Content, buttons: ButtonConfig[]): Promise<baileys.proto.WebMessageInfo | undefined> {
		try {
			function parseButton(type: string, object: ButtonConfig) {
				return 'title' in object
					? ({
							...object,
							title: object.listTitle ?? undefined,
							rowId: object.value ?? undefined,
					  } as {
							title?: string | null;
							description?: string | null;
							rowId?: string | null;
					  })
					: ({
							[type.includes('reply') ? 'quickReplyButton' : type + 'Button']: {
								displayText: object[type as keyof ButtonConfig],
								[type.includes('reply') ? 'id' : type.includes('call') ? 'phoneNumber' : type]: object.value ?? '',
							},
					  } as baileys.proto.IHydratedTemplateButton);
			}

			let hasList = false;
			let buttonData: baileys.proto.IHydratedTemplateButton[] | baileys.proto.ISection[] = [];

			for (const bc of buttons) {
				const type = Object.keys(bc)
					.find((v) => v !== 'value')
					?.toLowerCase();
				const parse = type ? parseButton(type, bc) : undefined;

				if ('title' in bc) {
					hasList = true;
					const rows: baileys.proto.IRow[] = [];
					rows.push(parse as baileys.proto.IRow);
					buttonData.push({
						rows,
						title: bc.title,
					});
				} else buttonData = (buttonData as baileys.proto.IHydratedTemplateButton[]).concat(parse as baileys.proto.IHydratedTemplateButton[]);
			}

			return this.sendMessage(mess, {
				...content,
				...{ [hasList ? 'sections' : 'templateButtons']: buttonData },
			});
		} catch (err) {
			throw err;
		}
	}

	public reply = async (mess: Metadata, text: string): Promise<baileys.proto.WebMessageInfo | undefined> =>
		this.sendMessage(mess, { text: utilities.format(text).trim(), quoted: mess });

	public throw = async (mess: Metadata, error: any, command: string, additonal?: object): Promise<baileys.proto.WebMessageInfo | undefined> => {
		await this.sendMessage(`${config.ownerNumber[0]}@s.whatsapp.net`, {
			text: `${utilities.wings('ERROR')}\n${utilities.parseJSON({ from: mess.from, command, ...additonal })}\n\n${utilities.format(error)}`,
		});
		return this.reply(
			mess,
			config.response.error +
				(statusMessage
					? `\n\nTerjadi masalah pada Cilok-Bot yang sedang berlangsung. silahkan ketik ${mess.string[0]}menu untuk melihat masalah yang terjadi.`
					: ''),
		);
	};

	public async downloadContent(mess: Metadata, filename?: string) {
		try {
			const values = Object.values(this.messageType);
			const type = Object.keys(mess).find((a) => values.includes(a) && !a.includes('senderKey') && !a.includes('context'));
			if (!type) throw new Error('Message type not found');
			return this.getBuffer(
				await this.baileys.downloadContentFromMessage(
					mess[type as keyof Metadata] as baileys.DownloadableMessage,
					type.replace(/Message/i, '').trim() as baileys.MediaType,
				),
				filename,
			);
		} catch (err) {
			throw err;
		}
	}

	public getBuffer = async (
		content: GetBuffer,
		filename?: string,
		autoFormat = true,
	): Promise<{
		filename?: string;
		buffer: Buffer;
		ext: core.FileExtension | 'bin';
		mime: core.MimeType | 'application/octet-stream';
	}> => {
		try {
			let buffer: Buffer;
			if (Buffer.isBuffer(content)) buffer = content;
			else if (/^data:.?\/.?;base64,/i.test(content as string)) buffer = Buffer.from((content as string).split(',')[1], 'base64');
			else if (/^https?:\/\//.test(content as string)) {
				axiosRetry(axios, {
					retries: 3,
					retryDelay(retryCount) {
						return retryCount * 5000;
					},
					onRetry(_, error, requestConfig) {
						if (error.message.includes('first certificate'))
							requestConfig.httpsAgent = new Agent({
								rejectUnauthorized: false,
							});
					},
				});
				buffer = (
					await axios.get(
						content as string,
						utilities.headers({
							responseType: 'arraybuffer',
						}),
					)
				)?.data;
			} else if (fs.existsSync(content as string)) buffer = fs.readFileSync(content as string);
			else if ((content as unknown as { _readableState: any })?._readableState) buffer = await this.baileys.toBuffer(content as Readable);
			else if (typeof content === 'string') buffer = Buffer.from(content);
			else buffer = Buffer.alloc(0);
			const template = (await fromBuffer(buffer)) || {
				ext: 'bin',
				mime: 'application/octet-stream',
			};

			if (filename) {
				filename = autoFormat ? `${filename}.${template.ext}` : filename;
				fs.writeFileSync(filename.includes(config.path.temp) ? filename : `${config.path.temp}${filename}`, buffer);
				return {
					filename,
					buffer,
					...template,
				};
			}
			return {
				buffer,
				...template,
			};
		} catch (err) {
			throw err;
		}
	};

	public prepareSticker = async (content: GetBuffer, exifPath?: string): Promise<Buffer> => {
		try {
			const bufferData = await this.getBuffer(content, utilities.autoPath(undefined, undefined, false)),
				input = utilities.autoPath(undefined, bufferData.filename!),
				output = utilities.autoPath('webp', bufferData.filename?.split('.')[0]!);
			if (!fs.existsSync(config.path.temp)) fs.mkdirSync(config.path.temp.split('/')[0]);
			if (bufferData.ext === 'webp')
				if (exifPath) {
					return new Promise((resolve) =>
						exec(`webpmux -set exif ${exifPath} ${input} -o ${input}`, (e) => {
							if (e) throw e;
							const saver = fs.readFileSync(input);
							if (fs.existsSync(input)) fs.unlinkSync(input);
							return resolve(saver);
						}),
					);
				} else {
					const saver = fs.readFileSync(input);
					if (fs.existsSync(input)) fs.unlinkSync(input);
					return saver;
				}

			return new Promise((resolve) =>
				Ffmpeg(input)
					.on('error', (e) => {
						if (fs.existsSync(input)) fs.unlinkSync(input);
						throw e;
					})
					.videoCodec('libwebp')
					.videoFilter(
						"scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
					)
					.toFormat('webp')
					.save(output)
					.on('end', () => {
						if (fs.existsSync(input)) fs.unlinkSync(input);
						if (exifPath) {
							return exec(`webpmux -set exif ${exifPath} ${output} -o ${output}`, (e) => {
								if (e) throw e;
								const saver = fs.readFileSync(output);
								if (fs.existsSync(output)) fs.unlinkSync(output);
								return resolve(saver);
							});
						} else {
							const saver = fs.readFileSync(output);
							if (fs.existsSync(output)) fs.unlinkSync(output);
							return resolve(saver);
						}
					}),
			);
		} catch (err) {
			throw err;
		}
	};
}
