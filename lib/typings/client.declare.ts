import { Readable } from 'form-data';
import {
	AnyMessageContent,
	GroupMetadata,
	MiscMessageGenerationOptions,
	proto,
} from '@adiwajshing/baileys';

export type IContent = AnyMessageContent & MiscMessageGenerationOptions;

export type IBuffer =
	| string
	| number
	| Readable
	| readonly number[]
	| { valueOf(): string | Uint8Array | readonly number[] }
	| URL;

export interface IProto extends proto.IWebMessageInfo {
	sender: {
		jid: string | null | undefined;
		name: string | null | undefined;
	};
	client: {
		name: string | undefined;
		jid: string;
	};
	isGroup: boolean;
	isOwner: boolean;
	isText: boolean;
	isMedia: boolean;
	type: string | undefined;
	realType: string;
	string: string;
	from: string | null | undefined;
	fromMe: boolean;
	id: string | null | undefined;
	mentionedJid: string[] | undefined;
	message: proto.IMessage | null | undefined;
	quotedMsg: object | IQuoted | undefined;
	body: proto.IMessage[keyof proto.IMessage];
	data: string[];
	groupData: GroupMetadata | undefined;
	downloadMsg: (filename?: string) => ReturnType<typeof global.client.downloadMessage>;
	deleteMsg: (forAll?: boolean) => Promise<proto.WebMessageInfo>;
}

export interface IQuoted {
	key: {
		remoteJid: string | null | undefined;
		fromMe: boolean;
		id: string | null | undefined;
		participant: string | null | undefined;
	};
	message: proto.IMessage | null | undefined;
}

export interface IStickerConfig {
	buffer: IBuffer;
	exif: string;
}
