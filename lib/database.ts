import _ from 'lodash';
import path from 'path';
import { Pool } from 'pg';
import * as fs from 'fs';

export default class Database {
	private static instance: Database;
	private static PG: Pool;
	public storage: Partial<Record<string, any>>;
	private constructor() {
		this.storage = {};
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
				for (const v of fs.readdirSync(config.path.database))
					Database.instance.storage[v.split('.')[0]] = (await import(path.join(path.resolve('.'), './src/database', v))).default;
			}
			utilities.logger('database', `Loaded ${Object.keys(Database.instance.storage).length} database(s)`);
			return Database.instance;
		} catch (err) {
			throw err;
		}
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
		const data = await Database.PG.query<{ tag: string; data: string }>('SELECT * FROM clk_database');
		if (data.rowCount > 0)
			for (const v of data.rows) {
				if (!v) continue;
				if (v.tag === 'session') this.writeSession(v.data);
				else
					try {
						this.storage[v.tag] = JSON.parse(v.data);
					} catch {
						this.storage[v.tag] = v.data;
					}
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
							_.pickBy(this.storage, (v) => v),
							fs.existsSync(`${config.path.database}session.json`) && Database.PG
								? {
										session: fs.readFileSync(`${config.path.database}session.json`, 'utf8'),
								  }
								: {},
						),
				  );
			data.forEach(async (v) => {
				if (v[1]) {
					v[1] = typeof v[1] === 'string' ? v[1] : JSON.stringify(v[1]);
					if (Database.PG)
						await Database.PG.query('INSERT INTO clk_database(tag, data) VALUES($1, $2) ON CONFLICT (tag) DO UPDATE SET data = $2', [v[0], v[1]]);
					else fs.writeFileSync(`${config.path.database}${v[0]}.json`, v[1]);
				}
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
		for (const k of Object.entries(this.storage))
			fs.writeFileSync(`${config.path.database}${k[0]}.${typeof k[1] === 'string' ? 'txt' : 'json'}`, JSON.stringify(k[1]));
		return void 0;
	}

	public async deleteRow<T extends any[]>(...tag: T): Promise<undefined> {
		if (!Database.PG) throw new Error('Must use PostgreSQL database');
		for (const t of tag) await Database.PG.query('DELETE FROM clk_database WHERE tag = $1', [t]);
		return void 0;
	}
}
