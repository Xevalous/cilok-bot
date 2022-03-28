import { Readable } from 'stream';
import { AnyMessageContent, GroupMetadata, MiscMessageGenerationOptions, proto } from '@adiwajshing/baileys';

export type Content =
	| (AnyMessageContent & MiscMessageGenerationOptions)
	| { image: string }
	| { filename: string }
	| { video: string }
	| { image: string };

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
	util: {
		downloadMess: (filename?: string) => ReturnType<typeof client.downloadMessage>;
		deleteMess: (forAll?: boolean) => Promise<proto.WebMessageInfo>;
	};
	type: [string, string | undefined];
	string: string;
	from: string | null | undefined;
	fromMe: boolean;
	mentionedJid: string[] | undefined;
	message: proto.IMessage | null | undefined;
	quotedMess: Proto | undefined;
	body: proto.IMessage[keyof proto.IMessage];
	data: string[];
	groupData: GroupMetadata | undefined;
}
