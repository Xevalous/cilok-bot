import _ from 'lodash';
import chalk from 'chalk';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { logger } from './utilities';
import { performance } from 'perf_hooks';

export default class Measure {
	private DB: Record<string, { tag: string; heapMemory: { before: string; after?: string }; time?: number | string }>;
	private static instance: Measure;
	private constructor() {
		this.DB = {} as typeof this.DB;
	}

	public static memoryUsage(): number {
		return Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
	}

	public static start(tag: string): void {
		if (!Measure.instance) Measure.instance = new Measure();
		this.instance.DB[tag] = {
			tag,
			heapMemory: {
				before: `${Measure.memoryUsage()} MB`,
			},
			time: performance.now(),
		};
		return void 0;
	}

	public static end = (tag: string) =>
		new Promise<typeof this.instance.DB[string]>((resolve, __) => {
			if (!this.instance.DB[tag]) return; //throw new Error(`${tag} does not exist.`);
			dayjs.extend(duration);
			this.instance.DB[tag].heapMemory.after = `${Measure.memoryUsage()} MB`;
			this.instance.DB[tag].time = `${dayjs
				.duration(performance.now() - (this.instance.DB[tag].time as number))
				.asSeconds()
				.toFixed(3)} MS`;
			logger(
				'measure',
				`${chalk.bold(_.upperFirst(tag))} took ${chalk.bold.underline(this.instance.DB[tag].time)} to complete with ${chalk.bold.underline(
					this.instance.DB[tag].heapMemory.before,
				)} to ${chalk.bold.underline(this.instance.DB[tag].heapMemory.after)} heap memory usage`,
			);
			resolve(this.instance.DB[tag]);
			return delete this.instance.DB[tag];
		});
}
