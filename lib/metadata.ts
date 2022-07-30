import _ from 'lodash';
import { Metadata } from './typings/metadata';
import * as baileys from '@adiwajshing/baileys';

export default async function metadata(mess: baileys.proto.IWebMessageInfo) {
	const proto = _.assign<Metadata, baileys.proto.IWebMessageInfo>({} as Metadata, mess);
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
		jid: proto.validator.isGroup ? (mess.key.participant ? mess.key.participant : client.socket.user?.id) : mess.key.remoteJid,
	};
	proto.validator.isOwner =
		config.ownerNumber.includes(proto.sender.jid ? proto.sender.jid.replace(/\:[0-9]{2}/, '').split('@')[0] : '') || (mess.key.fromMe ?? false);
	proto.client = {
		name: client.socket.user?.name,
		jid: client.socket.user!.id,
	};
	proto.mentionedJid =
		proto.data.includes('contextInfo') && proto.data.includes('mentionedJid')
			? (mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage].contextInfo.mentionedJid
			: undefined;
	proto.quoted =
		proto.data.includes('contextInfo') && proto.data.includes('quotedMessage')
			? ({
					key: {
						remoteJid: proto.from,
						fromMe:
							(mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage].contextInfo.participant ===
							client.socket.user?.id,
						id: (mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage].contextInfo.stanzaId,
						participant: (mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage].contextInfo
							.participant,
					},
					message: (mess.message as Record<keyof baileys.proto.IMessage, any>)[proto.type[1] as keyof baileys.proto.IMessage].contextInfo
						.quotedMessage,
			  } as {
					key: baileys.proto.IMessageKey;
					message: baileys.proto.IMessage;
			  } as Metadata)
			: undefined;
	proto.groupMetadata = proto.validator.isGroup ? database.storage.chats[proto.from!]?.groupMetadata ?? undefined : undefined;
	if (proto.validator.isGroup && !proto.groupMetadata) {
		proto.groupMetadata = await client.socket.groupMetadata(proto.from!);
		if (_.has(database.storage.chats, proto.from!)) database.storage.chats[`${proto.from!}`].groupMetadata = proto.groupMetadata;
	}
	proto.utilities = {
		downloadMess: async (filename) => await client.downloadContent(proto.message! as Metadata, filename!),
		deleteMess: (forAll = true) => {
			if (forAll)
				return client.socket.sendMessage(proto.from!, {
					delete: mess.key!,
				});
			else
				return client.socket.chatModify(
					{ clear: { messages: [{ id: mess.key.id!, fromMe: true, timestamp: mess.messageTimestamp as number }] } },
					proto.from!,
				);
		},
	};
	proto.quoted = proto.quoted ? (await nodeCache.get(proto.quoted.key.id!)) || (await metadata(proto.quoted! as Metadata)) : undefined;
	return proto;
}
