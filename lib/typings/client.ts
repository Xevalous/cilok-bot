import { Readable } from 'stream';
import { AnyMessageContent, MiscMessageGenerationOptions } from '@adiwajshing/baileys';

export type Content =
	| (AnyMessageContent & MiscMessageGenerationOptions)
	| { image: string }
	| { filename: string }
	| { video: string }
	| { image: string }
	| { audio: string };

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
