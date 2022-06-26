import Client from '../client';
import Command from '../command';
import Database from '../database';
import NodeCache from 'node-cache';
import { Pool } from 'pg';
import { Metadata } from './metadata';
import { AuthenticationState, GroupMetadata } from '@adiwajshing/baileys';

export type ProcessMode = 'dev' | 'production';

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			NODE_ENV: ProcessMode;
			PG_HOST: string;
			PG_PORT: string;
			PG_DATABASE: string;
			PG_USER: string;
			PG_PASSWORD: string;
			PG_SSL_REJECT_UNAUTHORIZED: boolean;
		}
	}
	interface String {
		normalizeJid: () => string;
		compress: () => string;
		decompress: () => string;
	}
	var statusMessage: string;
	var config: typeof import('../../src/config.json');
	var utilities: typeof import('../utilities');
	var nodeCache: NodeCache;
	var database: Database;
	var client: Client;
	var command: Command;
}
