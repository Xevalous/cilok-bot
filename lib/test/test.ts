import { parseRegex } from '../utilities';
import i from '../../src/cilok.config.json';

const a = i.prefix.map((a) =>
	(a as any) instanceof RegExp ? a : new RegExp(`^(${parseRegex(a)})`, 'i'),
);

console.log(a);
