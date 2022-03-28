import { Readable } from 'stream';
import { AnyMessageContent, GroupMetadata, MiscMessageGenerationOptions, proto } from '@adiwajshing/baileys';

<<<<<<< HEAD
export type Content =
=======
export declare type IContent =
>>>>>>> 6f7b9788bde00b8650952790b5877636250e90a1
	| (AnyMessageContent & MiscMessageGenerationOptions)
	| { image: string }
	| { filename: string }
	| { video: string }
	| { image: string };

<<<<<<< HEAD
export type ButtonConfig = { value: string } & (
	| {
			reply: string;
	  }
	| {
			url: string;
	  }
	| {
			call: string;
	  }
	| {
			title?: string;
			description?: string;
			listTitle?: string;
	  }
);

export type GetBuffer = string | number | Readable | readonly number[] | { valueOf(): string | Uint8Array | readonly number[] } | URL;

export interface StickerConfig {
	buffer: Buffer;
	exif: string;
}

export interface Proto extends proto.IWebMessageInfo {
=======
export declare type IBuffer =
	| string
	| number
	| Readable
	| readonly number[]
	| { valueOf(): string | Uint8Array | readonly number[] }
	| URL;

export declare type IButtonConfig = { value: string } & (
	| {
			reply: string;
	  }
	| {
			url: string;
	  }
	| {
			call: string;
	  }
	| {
			title?: string;
			description?: string;
			listTitle?: string;
	  }
);

export declare interface IProto extends proto.IWebMessageInfo {
>>>>>>> 6f7b9788bde00b8650952790b5877636250e90a1
	sender: {
		jid: string | null | undefined;
		name: string | null | undefined;
	};
	client: {
		name: string | undefined;
		jid: string;
	};
	validator: {
		message: {
			isText: boolean;
			isMedia: boolean;
		};
		isOwner: boolean;
		isGroup: boolean;
	};
<<<<<<< HEAD
	util: {
=======
	messFunctions: {
>>>>>>> 6f7b9788bde00b8650952790b5877636250e90a1
		downloadMess: (filename?: string) => ReturnType<typeof client.downloadMessage>;
		deleteMess: (forAll?: boolean) => Promise<proto.WebMessageInfo>;
	};
	type: [string, string | undefined];
	string: string;
	from: string | null | undefined;
	fromMe: boolean;
	mentionedJid: string[] | undefined;
	message: proto.IMessage | null | undefined;
<<<<<<< HEAD
	quotedMess: Proto | undefined;
	body: proto.IMessage[keyof proto.IMessage];
	data: string[];
	groupData: GroupMetadata | undefined;
=======
	quotedMess: object | IQuoted | undefined;
	body: proto.IMessage[keyof proto.IMessage];
	data: string[];
	groupData: GroupMetadata | undefined;
}

export declare interface IQuoted {
	key: {
		remoteJid: string | null | undefined;
		fromMe: boolean;
		id: string | null | undefined;
		participant: string | null | undefined;
	};
	message: proto.IMessage | null | undefined;
}

export declare interface IStickerConfig {
	buffer: IBuffer;
	exif: string;
>>>>>>> 6f7b9788bde00b8650952790b5877636250e90a1
}
