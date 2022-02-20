import axios from 'axios';

export default async function saveFrom(url: string) {
	try {
		const request = await axios.post(
			'https://worker.sf-tools.com/savefrom.php',
			new URLSearchParams(
				Object.entries({
					sf_url: url,
					sf_submit: '',
					new: '2',
					lang: 'en',
					app: '',
					country: 'id',
					os: 'Windows',
					browser: 'Opera',
					channel: ' main',
					'sf-nomad': '1',
				}),
			),
			{
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36',
					'sec-a-ua': '"Opera GX";v="81", " Not;A Brand";v="99", "Chromium";v="95"',
				},
			},
		);

		// const request = {
		// 	data: `(function(){
		// 	this._a=function(a,i,v){a[i]=v}; this._b=function(a,b,c,d,e){var f=Array.prototype.slice.call(arguments,4);return a?b.apply(d,f):c.apply(d,f)};
		// 	this._c=function(a){return decodeURIComponent(a)}; this._d=function(a){eval(a)};
		// 	this._e=function(a){var b="",e,c,h,f,g,d=0,a=a.replace(/[^A-Za-z0-9\+\/\=]/g,"");64==this.key.length&&(this.key+="=");for(a+=["","===","==","="][a.length%4];d<a.length;)e=this.key.indexOf(a.charAt(d++)),c=this.key.indexOf(a.charAt(d++)),f=this.key.indexOf(a.charAt(d++)),g=this.key.indexOf(a.charAt(d++)),e=e<<2|c>>4,c=(c&15)<<4|f>>2,h=(f&3)<<6|g,b+=String.fromCharCode(e),64!=f&&(b+=String.fromCharCode(c)),64!=g&&(b+=String.fromCharCode(h));return b}; this._f=function(a,i,j){a[i%a.length]=a.splice(j%a.length,1,a[i%a.length])[0];};this._g=function(d){for(var b="",c=0;c<d.length;c++){var a=d.charAt(c);this.chars[a]&&(a=this.chars[a]);b+=a}return b};
		// 	this._h=function(a,b){var c=a;a=b;b=c}; this._i=function(a,b){a=a.split(".");for(var c=b,d;d=a.shift();)if(null!=c[d])c=c[d];else return null;return c};this._j=function(a,b){var c=Array.prototype.slice.call(arguments,1);return function(){var b=c.slice();b.push.apply(b,arguments);return a.apply(this,b)}};
		// 	this._k=function(a,b){b=a.length-b;return a.substr(b)+a.substr(0,b)};this._l=function(a){return a.split("").reverse().join("")}; this._m=function(a,b){[]["filter"]["constructor"](b).call(a);};this._n=function(a,b){return a.concat.apply(a,arguments)};
		// 	this._o=function(a){var b=parseInt(a);if(isNaN(b))return parseInt(a,16);return b;};
		// 	this._p=function(a,b,c){return a.apply(b,Array.prototype.slice.call(arguments,2))};this._q=function(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";else if("function"==b&&"undefined"==typeof a.call)return"object";return b};
		// 	$d=this;
		// 	var $c="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",$e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",$b={"0":"S","1":"0","2":"m","3":"w","4":"F","5":"u","6":"Q","7":"W","8":"K","9":"H","a":"P","X":"B","b":"E","o":"6","J":"c","j":"o","M":"M","m":"j","Z":"z","L":"k","e":"X","c":"x","y":"+","z":"g","G":"G","k":"I","E":"s","h":"3","C":"R","H":"q","Y":"8","B":"5","D":"t","f":"4","P":"n","i":"U","K":"7","Q":"r","/":"l","u":"9","R":"a","g":"C","v":"A","d":"b","O":"d","U":"D","N":"V","n":"Z","x":"L","W":"e","p":"y","t":"p","F":"/","+":"h","T":"O","q":"f","A":"T","S":"i","V":"J","I":"2","r":"v","s":"N","w":"Y","l":"1"};
		// 	var $k = _g.call({chars: $b}, $e);
		// 	var $a = _e.call({key: $k}, "cO2S8UDgaRDwrUD+MoT1Mo21MSs1MocfcO2+cOctcO2+MiD+MUDgriD+MID1Mo21MIM1Mo2+cO2+cOV5cO2+DRD+MUD+r+D+MoM1Mo21MSs1MocVcO2+cOctcO2+VRD+MUDgriD+M1I1Mo21MIM1Mo20cO2+cOV5cO2+iRD+MUD+r+D+Mo81Mo21MSs1MocGcO2+cOctcO2+V+D+MUDgriD+M1r1Mo21MIM1Mo2FcO2+cOV5cO2+V+D+MUD+r+D+MoI1Mo21MSs1MocBcO2+cOctcO2+JRD+MUDgriD+M1s1Mo21MIM1MocgcO2+cOV5cO2+ORD+MUD+r+D+MI21Mo21MSs1Mo2ScO2+cOctcO2+OUD+MUDgriD+MjC1Mo21MIM1MocPcO2+cOV5cO2+iUD+MUD+r+D+MI61Mo21MSs1Moc1cO2+cOctcO2+bUD+MUDgriD+MjY1Mo21MIM1MockcO2+cOV5cO2+zUD+MUD+r+D+MjN1Mo21MSs1MocscO2+cOctcO2+O+D+MUDgriD+MoC1Mo21MIM1MocscO2+cOV5cO2+r+D+MUD+r+D+Mj61Mo21MSs1MococO2+cOctcO2+eRD+MUDgriD+Mo21Mo21MIM1Mo21MI81Mo21MSs1Moc3cO2+cOctcO2+PRD+MUDgriD+M181Mo21MIM1MocGcO2+cOV5cO2+EUD+MUD+r+D+MZx1Mo21MSs1MocRcO2+cOctcO2+PiD+MUDgriD+M1C1Mo21MIM1MocZcO2+cOV5cO2+i+D+MUD+r+D+M1s1Mo21MSs1MocqcO2+cOctcO2+E+D+MUDgriD+MjS1Mo21MIM1MocBcO2+cOV5cO2+DUD+MUD+r+D+MIY1Mo21MSs1MocycO2+cOctcO2+aiD+MUDgriD+MoT1Mo21MIM1MocecO2+cOV5cO2+XUD+MUD+r+D+MjF1Mo21MSs1Mo21MI21Mo21MIM1MocYcO2+cOV5cO2+z+D+MUD+r+D+MjS1Mo21MSs1MocmcO2+cOctcO2+bRD+MUDgriD+MoM1Mo21MIM1MocccO2+cOV5cO2+JiD+MUD+r+D+M1I1Mo21MSs1MocAcO2+cOctcO2+xUD+MUDgriD+MZs1Mo21MIM1MoctcO2+cOV5cO2+OUD+MUD+r+D+Mjr1Mo21MSs1Mo2LcO2+cOctcO2+8UD+MUDgriD+M161Mo21MIM1MocNcO2+cOV5cO2+xRD+MUD+r+D+MjM1Mo21MSs1Moc0cO2+cOctcO2+riD+MUDgriD+MoI1Mo21MIM1Moc2cO2+cOV5cO2+zRD+MUD+r+D+MZI1Mo21MSs1Mo2mcO2+cOctcO2+cOcRcO2+cOV5cO2+ViD+MUD+r+D+MIx1Mo21MSs1MocFcO2+cOctcO2+xiD+MUDgriD+MZr1Mo21MIM1MocjcO2+cOV5cO2+riD+MUD+r+D+M1T1Mo21MSs1MocvcO2+cOctcO2+XRD+MUDgriD+MIK1Mo21MIM1MocicO2+cOV5cO2+xUD+MUD+r+D+MZ61Mo21MSs1MocccO2+cOctcO2+biD+MUDgriD+MZI1Mo21MIM1MocVcO2+cOV5cO2+8UD+MUD+r+D+MjD1Mo21MSs1MocwcO2+cOctcO2+8iD+MUDgriD+MZM1Mo21MIM1MocJcO2+cOV5cO2+cOcGcO2+cOctcO2+D+D+MUDgriD+M1M1Mo21VSr1MS21MoavcO2YcOVscO2YBmx98m/NERC1VScoPG/+x+DgriD+MRD+VG21VSr1MIM1MoT1Moa17iDgrUDYriD+VGM1MSa4ERC1Moao7iDgrUDYriD+VGM1MSa4P+C1MoaocOctVtMmMiI1MS21Mss1MoaocOVsBmN6cO2S8+D+rg2mdtrycOVRcO55cO2S8+Dga/Hv7RD+VGM1MIM+MO8Y7iDgrUDYriD+VGM1MSa4P+C1MoaocOctVt8uMRI1MS21Mss1Moa3cO2YcOVscO2YBmD98m/NERC1VScvzBI1MSs1MoT1MoavcObscOctcO2YcO2S8+I1MS21Ms/4xR34EiD+r+D+VGr1MIM1MoaIcOctBmM6cO2S8iIycOVR");
		// 	this.$c=$c;this.$e=$e;this.$b=$b;this.$k=$k;this.$a=$a;
		// 	$a=_c($a);_p(_m,$d,$d,$a);
		// 	})();`,
		// };

		return console.log(request.data);

		function decrypt(this: { key: string }, encInput: string): string {
			let b = '',
				e: number,
				c: number,
				h: number,
				f: number,
				g: number,
				d = 0,
				a = encInput.replace(/[^A-Za-z0-9\+\/\=]/g, '');
			64 == this.key.length && (this.key += '=');
			for (a += ['', '===', '==', '='][a.length % 4]; d < a.length; )
				(e = this.key.indexOf(a.charAt(d++))),
					(c = this.key.indexOf(a.charAt(d++))),
					(f = this.key.indexOf(a.charAt(d++))),
					(g = this.key.indexOf(a.charAt(d++))),
					(e = (e << 2) | (c >> 4)),
					(c = ((c & 15) << 4) | (f >> 2)),
					(h = ((f & 3) << 6) | g),
					(b += String.fromCharCode(e)),
					64 != f && (b += String.fromCharCode(c)),
					64 != g && (b += String.fromCharCode(h));
			return b;
		}

		function decryptChars(this: { chars: { [k: string]: string } }, charInput: string): string {
			let b = '';
			for (let c = 0; c < charInput.length; c++) {
				let a = charInput.charAt(c);
				this.chars[a] && (a = this.chars[a]);
				b += a;
			}
			return b;
		}

		function arrayKeys(decryptedData: string): [number, number, number, number] {
			const a = /[0-9]{2,10}/g;
			let b: RegExpExecArray | null;
			const d: number[] = [];

			while ((b = a.exec(decryptedData)) !== null) {
				if (b.index === a.lastIndex) {
					a.lastIndex++;
				}
				b.forEach((c) => d.push(parseInt(c)));
			}
			return d as [number, number, number, number];
		}

		let chars = JSON.parse(/(\{?"[0-9A-Za-z/+]":"[0-9A-Za-z/+]",?\}?)+/.exec(request.data)![0]);
		const charsKey = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
		let data = /(=)("[A-Za-z0-9/+]+")/.exec(request.data)![2];
		let dataKey = decryptChars.call({ chars }, charsKey);
		const decryptData = decrypt.call(
			{ key: dataKey },
			/(}, )("[A-Za-z0-9/+]+")/.exec(request.data)![2],
		);

		chars = JSON.parse(
			/(\{?"[0-9A-Za-z/+]":"[0-9A-Za-z/+]",?\}?)+/.exec(decodeURIComponent(decryptData))![0],
		);
		dataKey = decryptChars.call({ chars }, charsKey);
		data = data.split('').reverse().join('').replace(/"/g, '');

		for (let b of arrayKeys(decodeURIComponent(decryptData))) {
			b = data.length - b;
			data = data.slice(b) + data.slice(0, b);
		}

		data = decodeURIComponent(decrypt.call({ key: dataKey }, data))
			.split('videoResult.show(')[1]
			.split(');;')[0];
		console.log(JSON.parse(data));
	} catch (e) {
		throw e;
	}
}

console.log(saveFrom('https://www.instagram.com/p/CYw6F9NolYj/'));
