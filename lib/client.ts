import axios from 'axios';
import Ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import { Readable } from 'form-data';
import { fromBuffer } from 'file-type';
import {
	IBuffer,
	IButtonConfig,
	IContent,
	IProto,
	IQuoted,
	IStickerConfig,
} from './typings/client.declare';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
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

	public send = async (
		mess: IProto,
		content: IContent,
	): Promise<baileys.WAProto.WebMessageInfo> => {
		try {
			let property: Record<string, any> = content;

			const type = Object.keys(property).find((a) => this.messageType[a]);
			if (!type) throw global.util.logger.format(new Error('The type is not defined'));
			const mediaKey = ['document', 'video', 'audio', 'image', 'sticker'];

			if (
				!(typeof property[type as keyof baileys.AnyMessageContent] === 'object') &&
				mediaKey.includes(type)
			) {
				const bufferData = await this.getBuffer(property[type as keyof baileys.AnyMessageContent]);

				if (type === 'image') {
					(property.caption as string) = property?.text
						? property.text
						: property?.caption
						? property.caption
						: '';
					delete property?.text;
				}

				property = {
					mimetype: (property?.mimetype
						? property.mimetype
						: type === 'audio'
						? 'audio/mp4'
						: bufferData.mime) as string,
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
			throw global.util.logger.format(e);
		}
	};

	public sendSticker = async (
		mess: IProto,
		content: IStickerConfig | IContent,
	): Promise<baileys.WAProto.WebMessageInfo> =>
		this.send(mess, {
			sticker: (await this.prepareSticker(
				(content as IStickerConfig).buffer,
				(content as IStickerConfig).exif ?? './src/misc/cilokS.exif',
			)) as baileys.WAMediaUpload,
			...content,
		});

	public sendButton = async (
		mess: IProto,
		content: IContent,
		buttons: IButtonConfig[],
	): Promise<baileys.WAProto.WebMessageInfo> => {
		try {
			function parseBtn(type: string, object: IButtonConfig) {
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
								displayText: object[type as keyof IButtonConfig],
								[type.includes('reply') ? 'id' : type.includes('call') ? 'phoneNumber' : type]:
									object.value ?? '',
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
					const rows: baileys.WAProto.IRow[] = [];
					rows.push(parse as baileys.WAProto.IRow);
					buttonsData.push({
						rows,
						title: a.title,
					});
				} else {
					buttonsData = (buttonsData as baileys.proto.IHydratedTemplateButton[]).concat(
						parse as baileys.proto.IHydratedTemplateButton[],
					);
				}
			}

			return this.send(mess, {
				...content,
				...{ [hasList ? 'sections' : 'templateButtons']: buttonsData },
			});
		} catch (e) {
			throw global.util.logger.format(e);
		}
	};

	public reply = async (mess: IProto, text: string): Promise<baileys.WAProto.WebMessageInfo> =>
		this.send(mess, { text: global.util.logger.format(text), quoted: mess });

	public downloadMessage = async (mess: IProto, filename: string) => {
		try {
			const values = Object.values(this.messageType);
			const type = Object.keys(mess).find(
				(a) => values.includes(a) && !a.includes('senderKey') && !a.includes('context'),
			);
			return this.getBuffer(
				await this.baileys.downloadContentFromMessage(
					mess[type as keyof IProto] as baileys.DownloadableMessage,
					(type as string).replace(/Message/i, '').trim() as baileys.MediaType,
				),
				filename,
			);
		} catch (e) {
			throw global.util.logger.format(e);
		}
	};

	public getBuffer = async (content: IBuffer, filename?: string, autoFormat = true) => {
		try {
			let buffer: Buffer;
			if (Buffer.isBuffer(content)) {
				buffer = content;
			} else if (/^data:.?\/.?;base64,/i.test(content as string)) {
				buffer = Buffer.from((content as string).split(',')[1], 'base64');
			} else if (/^https?:\/\//.test(content as string)) {
				if (/y2mate/gi.test(content as string)) {
					process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
				}
				buffer = (
					await axios.get(content as string, {
						responseType: 'arraybuffer',
						headers: {
							'user-agent':
								'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36 OPR/81.0.4196.61',
							'sec-ch-ua': '"Opera GX";v="81", " Not;A Brand";v="99", "Chromium";v="95"',
						},
					})
				).data;
			} else if (existsSync(content as string)) {
				buffer = readFileSync(content as string);
			} else if ((content as unknown as { _readableState: any })?._readableState) {
				buffer = await this.baileys.toBuffer(content as Readable);
			} else if (typeof content === 'string') {
				buffer = Buffer.from(content);
			} else {
				buffer = Buffer.alloc(0);
			}
			const template = (await fromBuffer(buffer)) || {
				ext: 'bin',
				mime: 'application/octet-stream',
			};

			if (filename) {
				filename = autoFormat ? `${filename}.${template.ext}` : filename;
				if (!existsSync(global.config.tempDir)) mkdirSync(global.config.tempDir.split('/')[1]);
				writeFileSync(
					filename.includes(global.config.tempDir)
						? filename
						: `${global.config.tempDir}${filename}`,
					buffer,
				);
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
			throw global.util.logger.format(e);
		}
	};

	public metadata = (mess: baileys.proto.IWebMessageInfo): Promise<IProto> => {
		async function fallback(mess: baileys.proto.IWebMessageInfo) {
			const proto: IProto = {} as IProto;

			proto.sender = {} as typeof proto.sender;
			proto.realType = Object.keys(mess.message!)[0];
			proto.message =
				proto.realType === 'ephemeralMessage'
					? mess.message?.ephemeralMessage?.message
					: mess.message;
			proto.type = Object.keys(mess.message!).find((a) => {
				const b = a.toString().toLowerCase();
				return !b.includes('senderkey') && !b.includes('context');
			});
			proto.data =
				typeof mess.message![proto.type as keyof baileys.WAProto.IMessage] === 'object'
					? Object.keys(mess.message![proto.type! as keyof baileys.WAProto.IMessage]!).includes(
							'contextInfo',
					  )
						? Object.keys(mess.message![proto.type! as keyof baileys.WAProto.IMessage]!).concat(
								Object.keys(
									(
										mess.message![proto.type! as keyof baileys.WAProto.IMessage]! as Record<
											string,
											any
										>
									).contextInfo,
								),
						  )
						: Object.keys(mess.message![proto.type! as keyof baileys.WAProto.IMessage]!)
					: Object.keys(mess.message!);
			proto.string =
				proto.type === 'conversation'
					? mess.message?.conversation
					: proto.data.includes('caption')
					? (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
							proto.type as keyof baileys.WAProto.IMessage
					  ]!.caption
					: proto.type === 'extendedTextMessage'
					? (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
							proto.type as keyof baileys.WAProto.IMessage
					  ].text
					: proto.type === 'templateButtomReplyMessage'
					? (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
							proto.type as keyof baileys.WAProto.IMessage
					  ].selectedId
					: proto.data[0] === 'listResponseMessage'
					? (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
							proto.type as keyof baileys.WAProto.IMessage
					  ].singleSelectReply.selectedRowId
					: '';
			proto.body = mess.message![proto.type as keyof baileys.WAProto.IMessage];
			proto.from = mess.key.remoteJid;
			proto.isGroup = proto.from!.includes('@g.us');
			proto.sender.jid = proto.isGroup
				? mess.key.participant
					? mess.key.participant
					: global.client.socket.user.id
				: mess.key.remoteJid;
			proto.sender.name = mess.pushName;
			proto.client = {} as typeof proto.client;
			proto.client.name = global.client.socket.user.name;
			proto.client.jid = global.client.socket.user.id.split(':')[0] + '@s.whatsapp.net';
			proto.mentionedJid =
				proto.data.includes('contextInfo') && proto.data.includes('mentionedJid')
					? (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
							proto.type as keyof baileys.WAProto.IMessage
					  ].contextInfo.mentionedJid
					: undefined;
			proto.isText = proto.type === 'conversation' || proto.type === 'extendedTextMessage';
			proto.isMedia = !proto.isText;
			proto.id = mess.key.id;
			proto.fromMe = mess.key.fromMe as boolean;
			proto.quotedMsg =
				proto.data.includes('contextInfo') && proto.data.includes('quotedMessage')
					? {
							key: {
								remoteJid: proto.from,
								fromMe:
									(mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
										proto.type as keyof baileys.WAProto.IMessage
									].contextInfo.participant === global.client.socket.user.id,
								id: (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
									proto.type as keyof baileys.WAProto.IMessage
								].contextInfo.stanzaId,
								participant: (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
									proto.type as keyof baileys.WAProto.IMessage
								].contextInfo.participant,
							},
							message: (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
								proto.type as keyof baileys.WAProto.IMessage
							].contextInfo.quotedMessage,
					  }
					: undefined;
			proto.isOwner =
				mess.key.fromMe ??
				(global.config.ownerNumber.includes(proto.sender.jid!.split('@')[0]) as boolean);
			proto.groupData = proto.isGroup
				? await global.client.socket.groupMetadata(proto.from!)
				: undefined;
			if (proto.groupData) {
				proto.sender = {
					...proto.sender,
					...proto.groupData.participants.find((a) => a.id === proto.sender.jid),
				};
				proto.client = {
					...proto.client,
					...proto.groupData.participants.find((a) => a.id === proto.client.jid),
				};
			}
			proto.downloadMsg = async (filename) =>
				await global.client.downloadMessage(proto.message! as IProto, filename!);
			proto.deleteMsg = (forAll = true) => {
				if (forAll) {
					return global.client.socket.sendMessage(proto.from!, {
						delete: {
							fromMe: true,
							id: mess.key.id,
							participant: mess.key.remoteJid,
						},
					});
				} else {
					return global.client.socket.sendMessage(proto.from!, {
						delete: {
							fromMe: true,
							id: mess.key.id,
							participant: mess.key.remoteJid,
						},
					});
				}
			};
			proto.quotedMsg = proto.quotedMsg
				? ((global.client.chats as Record<string, object>)[mess.key.remoteJid!] &&
						(global.client.chats as Record<string, { messages: Record<string, object> }>)[
							mess.key.remoteJid!
						].messages[(proto.quotedMsg as IQuoted).key.id!]) ||
				  (await fallback(proto.quotedMsg! as IQuoted))
				: undefined;

			return { ...mess, ...proto };
		}
		return fallback(mess);
	};

	private prepareSticker = async (content: IBuffer, exifPath: string) => {
		try {
			const bufferData = await this.getBuffer(content);
			const Buffer = bufferData.buffer;
			const input = global.util.autoPath(bufferData.ext);
			const output = global.util.autoPath('webp');
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
					throw global.util.logger.format(new Error(e));
				})
				.addInputOptions([
					'-vcodec',
					'libwebp',
					'-vf',
					"scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
				])
				.toFormat('webp')
				.save(output)
				.on('end', () => {
					if (exifPath) {
						return exec(`webpmux -set exif=${exifPath} ${output} ${output}`, (e) => {
							if (e) throw global.util.logger.format(e);
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
			throw global.util.logger.format(e);
		}
	};
}
