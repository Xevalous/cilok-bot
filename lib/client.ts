import core from 'file-type/core';
import axios from 'axios';
import Ffmpeg from 'fluent-ffmpeg';
import { Agent } from 'https';
import { exec } from 'child_process';
import { headers } from './utilities';
import { Readable } from 'stream';
import { fromBuffer } from 'file-type';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { GetBuffer, ButtonConfig, Content, Proto, StickerConfig } from './typings/client.declare';
import * as baileys from '@adiwajshing/baileys';

export default class Client {
	chats: {
		[k: string]: any;
	};
	baileys: typeof baileys;
	messageType: { [k: string]: string };
	constructor(public socket: baileys.WASocket) {
		this.chats = {};
		this.baileys = baileys;
		this.messageType = Object.fromEntries(
			Object.keys(baileys.proto)
				.filter((a) => a.endsWith('Message') || a.includes('Conversation'))
				.map((a) => {
					const type = a[0].toLowerCase() + a.slice(1);
					return [type.replace('Message', '').replace('conversation', 'text'), type];
				}),
		);
	}

	public send = async (mess: Proto | string, content: Content): Promise<baileys.proto.WebMessageInfo> => {
		try {
			let property: Record<string, any> = content;

			const type = Object.keys(property).find((a) => this.messageType[a]);
			if (!type) throw util.logger.format(new Error('The type is not defined'));
			const mediaKey = ['document', 'video', 'audio', 'image', 'sticker'];

			if (!(typeof property[type as keyof baileys.AnyMessageContent] === 'object') && mediaKey.includes(type)) {
				const bufferData = await this.getBuffer(property[type as keyof baileys.AnyMessageContent]);

				if (type === 'image') {
					(property.caption as string) = property?.text ? property.text : property?.caption ? property.caption : '';
					delete property?.text;
				}

				property = {
					mimetype: (property?.mimetype ? property.mimetype : type === 'audio' ? 'audio/mpeg' : bufferData.mime) as string,
					fileName: (!property?.filename
						? `${Date.now()}.${bufferData.ext}`
						: property?.filename.includes('.')
						? property.filename
						: `${property.filename}.${bufferData.ext}`) as string,
					...property,
					[type]: bufferData.buffer,
				};
			}

			return this.socket.sendMessage(
				typeof mess === 'object' ? mess.key.remoteJid! : mess,
				property as baileys.AnyMessageContent,
				property as baileys.MiscMessageGenerationOptions,
			);
		} catch (e) {
			throw util.logger.format(e);
		}
	};

	public sendSticker = async (mess: Proto, content: StickerConfig | Content): Promise<baileys.proto.WebMessageInfo> =>
		this.send(mess, {
			sticker: (await this.prepareSticker(
				(content as StickerConfig).buffer,
				(content as StickerConfig).exif ?? './src/misc/cilokS.exif',
			)) as baileys.WAMediaUpload,
			...content,
		});

	public sendButton = async (mess: Proto, content: Content, buttons: ButtonConfig[]): Promise<baileys.proto.WebMessageInfo> => {
		try {
			function parseBtn(type: string, object: ButtonConfig) {
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
			let buttonsData: baileys.proto.IHydratedTemplateButton[] | baileys.proto.ISection[] = [];

			for (const a of buttons) {
				const type = Object.keys(a)
					.find((c) => c !== 'value')
					?.toLowerCase();
				const parse = type ? parseBtn(type, a) : undefined;

				if ('title' in a) {
					hasList = true;
					const rows: baileys.proto.IRow[] = [];
					rows.push(parse as baileys.proto.IRow);
					buttonsData.push({
						rows,
						title: a.title,
					});
				} else buttonsData = (buttonsData as baileys.proto.IHydratedTemplateButton[]).concat(parse as baileys.proto.IHydratedTemplateButton[]);
			}

			return this.send(mess, {
				...content,
				...{ [hasList ? 'sections' : 'templateButtons']: buttonsData },
			});
		} catch (e) {
			throw util.logger.format(e);
		}
	};

	public reply = async (mess: Proto, text: string): Promise<baileys.proto.WebMessageInfo> =>
		this.send(mess, { text: util.logger.format(text).trim(), quoted: mess });

	public throw = async (mess: Proto, error: any, command: string): Promise<baileys.proto.WebMessageInfo> => {
		await this.send(config.ownerNumber[0] + '@s.whatsapp.net', {
			text: `Error\nCommand: ${command}\n\n${error}`,
		});
		return client.reply(mess, config.response.error);
	};

	downloadMessage = async (mess: Proto, filename?: string) => {
		try {
			const values = Object.values(this.messageType);
			const type = Object.keys(mess).find((a) => values.includes(a) && !a.includes('senderKey') && !a.includes('context'));
			return this.getBuffer(
				await this.baileys.downloadContentFromMessage(
					mess[type as keyof Proto] as baileys.DownloadableMessage,
					(type as string).replace(/Message/i, '').trim() as baileys.MediaType,
				),
				filename,
			);
		} catch (e) {
			throw util.logger.format(e);
		}
	};

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
				let httpsAgent = undefined;
				if (/y2mate|streamable/gi.test(content as string))
					httpsAgent = new Agent({
						rejectUnauthorized: false,
					});

				buffer = (
					await axios.get(
						content as string,
						headers({
							responseType: 'arraybuffer',
							httpsAgent,
						}),
					)
				).data;
			} else if (existsSync(content as string)) buffer = readFileSync(content as string);
			else if ((content as unknown as { _readableState: any })?._readableState) buffer = await this.baileys.toBuffer(content as Readable);
			else if (typeof content === 'string') buffer = Buffer.from(content);
			else buffer = Buffer.alloc(0);

			const template = (await fromBuffer(buffer)) || {
				ext: 'bin',
				mime: 'application/octet-stream',
			};

			if (filename) {
				filename = autoFormat ? `${filename}.${template.ext}` : filename;
				if (!existsSync(config.tempDir)) mkdirSync(config.tempDir.split('/')[1]);
				writeFileSync(filename.includes(config.tempDir) ? filename : `${config.tempDir}${filename}`, buffer);
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
		} catch (e) {
			throw util.logger.format(e);
		}
	};

	public metadata = (mess: baileys.proto.IWebMessageInfo): Promise<Proto> => {
		async function fallback(mess: baileys.proto.IWebMessageInfo) {
			const proto: Proto = {} as Proto;
			proto.type = [
				Object.keys(mess.message!)[0],
				Object.keys(mess.message!).find((a) => {
					const b = a.toString().toLowerCase();
					return !b.includes('senderkey') && !b.includes('context');
				}),
			]; // [0] for realType else [1]
			proto.message = proto.type[1] === 'ephemeralMessage' ? mess.message?.ephemeralMessage?.message : mess.message;
			proto.data =
				typeof mess.message![proto.type[1] as keyof baileys.proto.IMessage] === 'object'
					? Object.keys(mess.message![proto.type[1] as keyof baileys.proto.IMessage]!).includes('contextInfo')
						? Object.keys(mess.message![proto.type[1] as keyof baileys.proto.IMessage]!).concat(
								Object.keys((mess.message![proto.type[1] as keyof baileys.proto.IMessage]! as Record<string, any>).contextInfo),
						  )
						: Object.keys(mess.message![proto.type[1] as keyof baileys.proto.IMessage]!)
					: Object.keys(mess.message!);
			proto.string =
				proto.type[1] === 'conversation'
					? mess.message?.conversation
					: proto.data.includes('caption')
					? (mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage]!.caption
					: proto.type[1] === 'extendedTextMessage'
					? (mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage].text
					: proto.type[1] === 'templateButtonReplyMessage'
					? (mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage].selectedId
					: proto.type[1] === 'listResponseMessage'
					? (mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage].singleSelectReply.selectedRowId
					: '';

			proto.body = mess.message![proto.type[1] as keyof baileys.proto.IMessage];
			proto.from = mess.key.remoteJid;
			proto.validator = {
				message: {
					isText: proto.type[1] === 'conversation' || proto.type[1] === 'extendedTextMessage',
					isMedia:
						proto.type[1] === 'stickerMessage' ||
						proto.type[1] === 'imageMessage' ||
						proto.type[1] === 'audioMessage' ||
						proto.type[1] === 'videoMessage' ||
						proto.type[1] === 'documentMessage',
				},
				isOwner: false,
				isGroup: proto.from!.includes('@g.us'),
			};
			proto.sender = {
				name: mess.pushName,
				jid: proto.validator.isGroup ? (mess.key.participant ? mess.key.participant : client.socket.user.id) : mess.key.remoteJid,
			};
			proto.validator.isOwner =
				config.ownerNumber.includes(proto.sender.jid ? proto.sender.jid.split('@')[0].split(':')[0] : '') || (mess.key.fromMe ?? false);
			proto.client = {
				name: client.socket.user.name,
				jid: client.socket.user.id.split(':')[0] + '@s.whatsapp.net',
			};
			proto.mentionedJid =
				proto.data.includes('contextInfo') && proto.data.includes('mentionedJid')
					? (mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage].contextInfo.mentionedJid
					: undefined;

			proto.quotedMess =
				proto.data.includes('contextInfo') && proto.data.includes('quotedMessage')
					? ({
							key: {
								remoteJid: proto.from,
								fromMe:
									(mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage].contextInfo
										.participant === client.socket.user.id,
								id: (mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage].contextInfo.stanzaId,
								participant: (mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage].contextInfo
									.participant,
							},
							message: (mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage].contextInfo
								.quotedMessage,
					  } as {
							key: baileys.proto.IMessageKey;
							message: baileys.proto.IMessage;
					  } as Proto)
					: undefined;
			proto.groupData = proto.validator.isGroup ? (await client.socket.groupMetadata(proto.from!)) ?? undefined : undefined;
			proto.util = {
				downloadMess: async (filename) => await client.downloadMessage(proto.message! as Proto, filename!),
				deleteMess: (forAll = true) => {
					if (forAll) {
						return client.socket.sendMessage(proto.from!, {
							delete: {
								fromMe: true,
								id: mess.key.id,
								participant: mess.key.remoteJid,
							},
						});
					} else {
						return client.socket.sendMessage(proto.from!, {
							delete: {
								fromMe: true,
								id: mess.key.id,
								participant: mess.key.remoteJid,
							},
						});
					}
				},
			};
			proto.quotedMess = proto.quotedMess
				? (((client.chats as Record<string, object>)[mess.key.remoteJid!] &&
						(client.chats as Record<string, { messages: Record<string, object> }>)[mess.key.remoteJid!].messages[
							(proto.quotedMess as Proto).key.id!
						]) as Proto) || (await fallback(proto.quotedMess! as Proto))
				: undefined;
			return { ...mess, ...proto };
		}
		return fallback(mess);
	};

	private prepareSticker = async (content: GetBuffer, exifPath: string) => {
		try {
			const bufferData = await this.getBuffer(content),
				Buffer = bufferData.buffer;
			const input = util.autoPath(bufferData.ext),
				output = util.autoPath('webp');
			if (!existsSync('./tmp')) mkdirSync('tmp');
			writeFileSync(input, Buffer);

			if (bufferData.ext === 'webp') {
				if (exifPath) {
					return exec(`webpmux -set exif=${exifPath} ${input} ${input}`, (e) => {
						if (e) throw e;
						const saver = readFileSync(input);
						unlinkSync(input);
						return saver;
					});
				} else {
					const saver = readFileSync(input);
					unlinkSync(input);
					return saver;
				}
			}

			return Ffmpeg(input)
				.on('error', (e) => {
					unlinkSync(input);
					throw util.logger.format(new Error(e));
				})
				.videoCodec('libwebp')
				.addInputOptions([
					'-vf',
					"scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
				])
				.toFormat('webp')
				.save(output)
				.on('end', () => {
					if (exifPath) {
						return exec(`webpmux -set exif=${exifPath} ${output} ${output}`, (e) => {
							if (e) throw util.logger.format(e);
							const saver = readFileSync(output);
							unlinkSync(input);
							unlinkSync(output);
							return saver;
						});
					} else {
						const saver = readFileSync(output);
						unlinkSync(input);
						unlinkSync(output);
						return saver;
					}
				});
		} catch (e) {
			throw util.logger.format(e);
		}
	};
}
