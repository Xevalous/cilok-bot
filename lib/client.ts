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
		mess: IProto | string,
		content: IContent,
	): Promise<baileys.WAProto.WebMessageInfo> => {
		try {
			let property: Record<string, any> = content;

			const type = Object.keys(property).find((a) => this.messageType[a]);
			if (!type) throw util.logger.format(new Error('The type is not defined'));
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
						? 'audio/mpeg'
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
			throw util.logger.format(e);
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
			throw util.logger.format(e);
		}
	};

	public reply = async (mess: IProto, text: string): Promise<baileys.WAProto.WebMessageInfo> =>
		this.send(mess, { text: util.logger.format(text), quoted: mess });

	public throw = async (
		mess: IProto,
		error: any,
		command: string,
	): Promise<baileys.WAProto.WebMessageInfo> => {
		await this.send(config.ownerNumber[0] + '@s.whatsapp.net', {
			text: `Error\nCommand: ${command}\n\n${error}`,
		});
		return client.reply(mess, config.response.error);
	};

	downloadMessage = async (mess: IProto, filename: string) => {
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
			throw util.logger.format(e);
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
				if (!existsSync(config.tempDir)) mkdirSync(config.tempDir.split('/')[1]);
				writeFileSync(
					filename.includes(config.tempDir) ? filename : `${config.tempDir}${filename}`,
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
			throw util.logger.format(e);
		}
	};

	public metadata = (mess: baileys.proto.IWebMessageInfo): Promise<IProto> => {
		async function fallback(mess: baileys.proto.IWebMessageInfo) {
			const proto: IProto = {} as IProto;

			proto.type = [
				Object.keys(mess.message!)[0],
				Object.keys(mess.message!).find((a) => {
					const b = a.toString().toLowerCase();
					return !b.includes('senderkey') && !b.includes('context');
				}),
			]; // [0] for realType else [1]
			proto.message =
				proto.type[1] === 'ephemeralMessage'
					? mess.message?.ephemeralMessage?.message
					: mess.message;
			proto.data =
				typeof mess.message![proto.type[1] as keyof baileys.WAProto.IMessage] === 'object'
					? Object.keys(mess.message![proto.type[1] as keyof baileys.WAProto.IMessage]!).includes(
							'contextInfo',
					  )
						? Object.keys(mess.message![proto.type[1] as keyof baileys.WAProto.IMessage]!).concat(
								Object.keys(
									(
										mess.message![proto.type[1] as keyof baileys.WAProto.IMessage]! as Record<
											string,
											any
										>
									).contextInfo,
								),
						  )
						: Object.keys(mess.message![proto.type[1] as keyof baileys.WAProto.IMessage]!)
					: Object.keys(mess.message!);
			proto.string =
				proto.type[1] === 'conversation'
					? mess.message?.conversation
					: proto.data.includes('caption')
					? (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
							proto.type[1] as keyof baileys.WAProto.IMessage
					  ]!.caption
					: proto.type[1] === 'extendedTextMessage'
					? (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
							proto.type[1] as keyof baileys.WAProto.IMessage
					  ].text
					: proto.type[1] === 'templateButtonReplyMessage'
					? (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
							proto.type[1] as keyof baileys.WAProto.IMessage
					  ].selectedId
					: proto.data[0] === 'listResponseMessage'
					? (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
							proto.type[1] as keyof baileys.WAProto.IMessage
					  ].singleSelectReply.selectedRowId
					: '';
			proto.body = mess.message![proto.type[1] as keyof baileys.WAProto.IMessage];
			proto.from = mess.key.remoteJid;
			proto.fromMe = mess.key.fromMe as boolean;
			proto.validator = {
				message: {
					isText: proto.type[1] === 'conversation' || proto.type[1] === 'extendedTextMessage',
					isMedia: false,
				},
				isOwner:
					mess.key.fromMe ??
					(config.ownerNumber.includes(proto.sender.jid!.split('@')[0]) as boolean),
				isGroup: proto.from!.includes('@g.us'),
			};
			proto.validator.message.isMedia = !proto.validator.message.isText;
			proto.sender = {
				name: mess.pushName,
				jid: proto.validator.isGroup
					? mess.key.participant
						? mess.key.participant
						: client.socket.user.id
					: mess.key.remoteJid,
			};
			proto.client = {
				name: client.socket.user.name,
				jid: client.socket.user.id.split(':')[0] + '@s.whatsapp.net',
			};
			proto.mentionedJid =
				proto.data.includes('contextInfo') && proto.data.includes('mentionedJid')
					? (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
							proto.type[1] as keyof baileys.WAProto.IMessage
					  ].contextInfo.mentionedJid
					: undefined;

			proto.quotedMess =
				proto.data.includes('contextInfo') && proto.data.includes('quotedMessage')
					? {
							key: {
								remoteJid: proto.from,
								fromMe:
									(mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
										proto.type[1] as keyof baileys.WAProto.IMessage
									].contextInfo.participant === client.socket.user.id,
								id: (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
									proto.type[1] as keyof baileys.WAProto.IMessage
								].contextInfo.stanzaId,
								participant: (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
									proto.type[1] as keyof baileys.WAProto.IMessage
								].contextInfo.participant,
							},
							message: (mess.message as Record<keyof baileys.WAProto.IMessage, any>)[
								proto.type[1] as keyof baileys.WAProto.IMessage
							].contextInfo.quotedMessage,
					  }
					: undefined;
			proto.groupData = proto.validator.isGroup
				? await client.socket.groupMetadata(proto.from!)
				: undefined;
			proto.messFunctions = {
				downloadMess: async (filename) =>
					await client.downloadMessage(proto.message! as IProto, filename!),
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
				? ((client.chats as Record<string, object>)[mess.key.remoteJid!] &&
						(client.chats as Record<string, { messages: Record<string, object> }>)[
							mess.key.remoteJid!
						].messages[(proto.quotedMess as IQuoted).key.id!]) ||
				  (await fallback(proto.quotedMess! as IQuoted))
				: undefined;

			return { ...mess, ...proto };
		}
		return fallback(mess);
	};

	private prepareSticker = async (content: IBuffer, exifPath: string) => {
		try {
			const bufferData = await this.getBuffer(content);
			const Buffer = bufferData.buffer;
			const input = util.autoPath(bufferData.ext);
			const output = util.autoPath('webp');
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
