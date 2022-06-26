import { GroupMetadata, proto } from '@adiwajshing/baileys';

export interface Metadata extends proto.IWebMessageInfo {
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
	utilities: {
		downloadMess: (filename?: string) => ReturnType<typeof client.downloadContent>;
		deleteMess: (forAll?: boolean) => Promise<proto.WebMessageInfo | void>;
	};
	type: [string, string | undefined];
	string: string;
	from: string | null | undefined;
	fromMe: boolean;
	mentionedJid: string[] | undefined;
	message: proto.IMessage | null | undefined;
	quoted?: Metadata;
	body: proto.IMessage[keyof proto.IMessage];
	data: string[];
	groupMetadata?: GroupMetadata;
}
