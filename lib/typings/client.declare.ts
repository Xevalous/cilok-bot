import { Readable } from 'form-data';
import {
	AnyMessageContent,
	GroupMetadata,
	MiscMessageGenerationOptions,
	proto,
} from '@adiwajshing/baileys';

export declare type IContent =
	| (AnyMessageContent & MiscMessageGenerationOptions)
	| { image: string }
	| { filename: string }
	| { video: string }
	| { image: string };

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
	messFunctions: {
		downloadMess: (filename?: string) => ReturnType<typeof client.downloadMessage>;
		deleteMess: (forAll?: boolean) => Promise<proto.WebMessageInfo>;
	};
	type: [string, string | undefined];
	string: string;
	from: string | null | undefined;
	fromMe: boolean;
	mentionedJid: string[] | undefined;
	message: proto.IMessage | null | undefined;
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
}
