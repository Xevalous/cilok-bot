import axios from 'axios';
import FormData from 'form-data';
import { load } from 'cheerio';
import { append, headers } from '../utilities';
import { createReadStream } from 'fs';

export default async function webp2mp4(file: string): Promise<{ status: number; author: string; result: string }> {
	try {
		async function request(form: FormData, file = '') {
			return axios.post(
				file ? `https://ezgif.com/webp-to-mp4/${file}` : 'https://s6.ezgif.com/webp-to-mp4',
				form,
				headers(undefined, {
					'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`,
				}),
			);
		}
		let form = append.form({
			'new-image-url': '',
			'new-image': createReadStream(file),
		});
		let $ = load((await request(form)).data);
		const filename = $('input[name="file"]').attr('value');
		form = append.form({
			file: filename,
			convert: 'Convert WebP to MP4!',
		});
		const requestData = await request(form, filename);
		$ = load(requestData.data);
		return {
			status: requestData.status,
			author: 'VEXG',
			result: `https:${$('div#output > p.outfile > video > source').attr('src')}`,
		};
	} catch (e) {
		throw e;
	}
}
