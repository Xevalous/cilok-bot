import _ from 'lodash';
import path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';

export default class Database {
	private static instance: Database;
	private static PG: Pool;
	private DB: Record<string, any>;
	private constructor() {
		this.DB = {};
	}

	public static async connect(usePgsql: boolean): Promise<Database> {
		try {
			if (!Database.instance) Database.instance = new Database();
			if (!fs.existsSync(config.path.database)) fs.mkdirSync(config.path.database);
			if (usePgsql) {
				utilities.logger('database', 'Using postgreSQL');
				await this.instance.PGHandler();
			} else {
				utilities.logger('database', 'Using local database');
				for (const v of fs.readdirSync(config.path.database)) (await import(path.join(path.resolve('.'), './src/database', v))).default;
			}
			utilities.logger('database', `Loaded ${Object.keys(Database.instance.DB).length} database(s)`);
			return Database.instance;
		} catch (err) {
			throw err;
		}
	}

	public get data(): Partial<Record<string, any>> {
		return this.DB;
	}

	public get modify() {
		return {
			set: (key: string, value: any) => _.set(this.DB, key, value),
			remove: (key: string) => _.unset(this.DB, key),
		};
	}

	private async PGHandler(): Promise<void> {
		const config = {
			host: process.env.PG_HOST,
			port: parseInt(process.env.PG_PORT!),
			database: process.env.PG_DATABASE,
			user: process.env.PG_USER,
			password: process.env.PG_PASSWORD,
			...(process.env.PG_SSL_REJECT_UNAUTH !== 'null' ? { ssl: { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTH === 'true' } } : {}),
		};
		if (Object.values(config).some((v) => v === undefined || (typeof v === 'number' && isNaN(v as number))))
			throw new Error('There is a invalid value in PGsql config, please check your .env file');
		Database.PG = new Pool(config);
		Database.PG.on('error', (err) => {
			throw err;
		});
		await Database.PG.query(
			'CREATE TABLE IF NOT EXISTS clk_database(tag varchar(100) PRIMARY KEY, data text); DELETE FROM clk_database WHERE data IS NULL;',
		);
		const DB = await Database.PG.query<{ tag: string; data: string }>('SELECT * FROM clk_database');
		if (DB.rowCount > 0)
			for (const v of DB.rows)
				if (v.tag === 'session') this.writeSession(v.data);
				else
					try {
						this.DB[v.tag] = JSON.parse(v.data);
					} catch {
						this.DB[v.tag] = v.data;
					}
		return void 0;
	}

	public save(fromLocalToPG?: boolean) {
		try {
			utilities.logger('database', 'Saving database...');
			const data: [string, string | object | any[]][] = fromLocalToPG
				? _.map(fs.readdirSync(config.path.database), (v) => [v.split('.')[0], fs.readFileSync(path.join(config.path.database, v), 'utf8')])
				: Object.entries(
						_.merge(
							_.pickBy(this.DB, (v) => v),
							fs.existsSync(`${config.path.database}session.json`) && Database.PG
								? {
										session: fs.readFileSync(`${config.path.database}session.json`, 'utf8'),
								  }
								: {},
						),
				  );
			data.forEach(async (v) => {
				if (v[1])
					if (Database.PG)
						await Database.PG.query('INSERT INTO clk_database(tag, data) VALUES($1, $2) ON CONFLICT (tag) DO UPDATE SET data = $2', [v[0], v[1]]);
					else fs.writeFileSync(`${config.path.database}${v[0]}.json`, typeof v[1] === 'string' ? v[1] : JSON.stringify(v[1]));
			});
			utilities.logger('database', 'Successfully saved database');
			return void 0;
		} catch (err) {
			throw err;
		}
	}

	private async writeSession(data: string): Promise<undefined> {
		fs.writeFileSync(`${config.path.database}session.json`, data);
		return void 0;
	}

	public async writeDatabaseToLocal(): Promise<undefined> {
		for (const k of Object.entries(this.DB))
			fs.writeFileSync(`${config.path.database}${k[0]}.${typeof k[1] === 'string' ? 'txt' : 'json'}`, JSON.stringify(k[1]));
		return void 0;
	}

	public async deleteSessionFromPG(): Promise<undefined> {
		await Database.PG.query('DELETE FROM clk_database WHERE tag = $1', ['session']);
		return void 0;
	}
}
