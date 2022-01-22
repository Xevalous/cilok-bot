/* global config */
const Ffmpeg = require('fluent-ffmpeg');
const baileys = require('@adiwajshing/baileys-md');
const { exec } = require('child_process');
const { format } = require('util');
const { fromBuffer } = require('file-type');
const { default: axios } = require('axios');
const {
    existsSync,
    readFileSync,
    writeFileSync,
    mkdirSync,
    unlinkSync
} = require('fs');

module.exports = class WAconnection {
    constructor (client) {
        Object.entries(client).forEach(([a, b]) => {
            this[a] = b;
        });
        Object.entries(baileys).forEach(([a, b]) => {
            this[a] = b;
        });
        this.chats = {};
        this.messageType = Object.fromEntries(
            Object.keys(this.proto)
                .filter((a) => a.endsWith('Message'))
                .map((a) => {
                    const type = a[0].toLowerCase() + a.slice(1);
                    return [type.replace('Message', ''), type];
                })
        );
        this.messageType.text = 'conversation';
    }

    async send (mess, property = {}) {
        const type = Object.keys(property).find((a) => this.messageType[a]);
        if (!type) throw new Error('The type is not defined');
        const mediaTag = ['image', 'document', 'video', 'audio', 'sticker'];
        let prop = {};
        if (!(typeof property[type] === 'object') && mediaTag.includes(type)) {
            if (type === 'image') {
                property.caption = property?.text
                    ? property.text
                    : !property?.caption
                        ? ''
                        : property.caption;
                delete property?.text;
            }
            const data = await this.getBuffer(property[type]);
            prop = {
                mimetype: property?.mimetype
                    ? property.mimetype
                    : type === 'audio'
                        ? 'audio/mp4'
                        : data.mime,
                fileName: !property?.filename
                    ? `${Date.now()}.${data.ext}`
                    : property?.filename.includes('.')
                        ? property.filename
                        : `${property.filename}.${data.ext}`,
                ...property,
                [type]: data.buffer
            };
        }
        return this.sendMessage(
            typeof mess === 'object' ? mess.key.remoteJid : mess,
            prop[type] ? prop : property,
            prop[type] ? prop : property
        );
    }

    async reply (mess, text) {
        return this.send(mess, {
            text: format(text),
            quoted: mess
        });
    }

    async sendSticker (mess, property = {}) {
        return this.send(mess, {
            sticker: await this.prepareSticker(
                property.buffer,
                property.exif ?? './src/cilokS.exif'
            ),
            ...property
        });
    }

    async sendMessageFromContent (mess, property = {}) {
        property.quoted =
            !property.quoted && typeof mess === 'object'
                ? mess
                : property.quoted;
        property.upload = this.waUploadToServer;
        const prepare = await this.generateWAMessageFromContent(
            typeof mess === 'object' ? mess.key.remoteJid : mess,
            property,
            property
        );
        await this.relayMessage(prepare.key.remoteJid, prepare.message, {
            messageId: prepare.key.id
        });
        return prepare;
    }

    async sendButton (mess, property = {}, ...buttons) {
        function parseBtn (type, obj = {}) {
            return obj.title
                ? {
                    ...obj,
                    rowId: obj.rowId || obj.value
                }
                : {
                    [type.includes('reply')
                        ? 'quickReplyButton'
                        : type + 'Button']: {
                        displayText: obj[type],
                        [type.includes('reply')
                            ? 'id'
                            : type.includes('call')
                                ? 'phoneNumber'
                                : type]: obj.value || ''
                    }
                };
        }
        let hasList = false;
        let buttonData = [];
        buttons.forEach((a) => {
            if (Array.isArray(a)) {
                const parseButton = a.map((b) => {
                    const type = Object.keys(b)
                        .find((c) => c !== 'value')
                        .toLowerCase();
                    return parseBtn(type, b);
                });
                if (a[0].title || hasList) {
                    hasList = true;
                    buttonData.push({
                        rows: parseButton,
                        title: a[0].header
                    });
                } else {
                    buttonData = buttonData.concat(parseButton);
                }
            } else {
                if (a.title || hasList) {
                    hasList = true;
                    let findIndex = buttonData.findIndex(
                        (b) => b.title === a.header
                    );
                    findIndex =
                        findIndex !== -1
                            ? findIndex
                            : a.header
                                ? buttonData.length
                                : buttonData.length - 1;
                    buttonData[findIndex] = buttonData[findIndex] || {};
                    buttonData[findIndex].title =
                        buttonData[findIndex].title || a.header;
                    buttonData[findIndex].rows =
                        buttonData[findIndex].rows || [];
                    buttonData[findIndex].rows.push(parseBtn('ok', a));
                } else {
                    buttonData.push(
                        parseBtn(
                            Object.keys(a)
                                .find((r) => r !== 'value')
                                .toLowerCase(),
                            a
                        )
                    );
                }
            }
        });
        let parse;
        if (!hasList) {
            parse = {
                ...property,
                templateButtons: buttonData
            };
        } else {
            parse = {
                ...property,
                sections: buttonData
            };
        }
        return this.send(mess, parse);
    }

    throw (mess, command = '', error) {
        this.reply(mess, config.response.error);
        console.log(error);
        this.send(config.reportNumber, {
            text: `${config.unicode.list} Command : ${command}\n${format(
                error
            )}`
        });
    }

    async groupQuery (jid, type, content) {
        return this.query({
            tag: 'iq',
            attrs: {
                type,
                xmlns: 'w:g2',
                to: jid
            },
            content
        });
    }

    async groupParticipants (jid, participants = []) {
        let participantsAffected = [];
        for (const a of participants) {
            const result = await this.groupQuery(jid, 'set', [
                {
                    tag: a.action,
                    attrs: {},
                    content: [
                        {
                            tag: 'participant',
                            attrs: {
                                jid: a.jid
                            }
                        }
                    ]
                }
            ]);
            const node = (0, this.getBinaryNodeChild)(result, a.action);
            participantsAffected = participantsAffected.push(
                (0, this.getBinaryNodeChildren)(node, 'participant')
            );
        }
        return participantsAffected;
    }

    async downloadMessage (message, filename = '') {
        const values = Object.values(this.messageType);
        const type = Object.keys(message).find(
            (a) =>
                values.includes(a) &&
                !a.includes('senderKey') &&
                !a.includes('context')
        );
        return this.getBuffer(
            await this.downloadContentFromMessage(
                message[type],
                type.replace(/Message/i, '').trim()
            ),
            filename
        );
    }

    async getBuffer (path, fileName = '', autoExt = true) {
        try {
            let buffer;
            if (Buffer.isBuffer(path)) {
                buffer = path;
            } else if (/^data:.?\/.?;base64,/i.test(path)) {
                buffer = Buffer.from(path.split(',')[1], 'base64');
            } else if (/^https?:\/\//.test(path)) {
                if (/y2mate/gi.test(path)) {
                    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
                }
                buffer = (
                    await axios.get(path, {
                        responseType: 'arraybuffer',
                        headers: {
                            'user-agent':
                                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36 OPR/81.0.4196.61',
                            'sec-ch-ua':
                                '"Opera GX";v="81", " Not;A Brand";v="99", "Chromium";v="95"'
                        }
                    })
                ).data;
            } else if (existsSync(path)) {
                buffer = readFileSync(path);
            } else if (path?._readableState) {
                buffer = await this.toBuffer(path);
            } else if (typeof path === 'string') {
                buffer = Buffer.from(path);
            } else {
                buffer = Buffer.alloc(0);
            }
            const template = (await fromBuffer(buffer)) || {
                ext: 'bin',
                mime: 'application/octet-stream'
            };

            if (fileName) {
                const filename = autoExt
                    ? `${fileName}.${template.ext}`
                    : fileName;
                if (!existsSync('./tmp')) mkdirSync('tmp');
                writeFileSync(
                    /.\/tmp\//i.test(filename) ? filename : `./tmp/${filename}`,
                    buffer
                );
                return {
                    filename,
                    buffer,
                    ...template
                };
            }
            return {
                buffer,
                ...template
            };
        } catch (e) {
            throw e;
        }
    }

    async prepareSticker (path, exif = '') {
        const bufferData = await this.getBuffer(path);
        const buff = bufferData.buffer;
        const filename = `./tmp${Date.now()}.${bufferData.ext}`;
        const output = filename.replace(bufferData.ext, 'webp');
        if (!existsSync('./tmp')) {
            mkdirSync('tmp');
        }
        writeFileSync(filename, buff);

        if (bufferData.ext === 'webp') {
            if (exif) {
                return new Promise((resolve, reject) => {
                    exec(
                        `webpmux -set exif ${exif} ${output} -o ${output}`,
                        (err) => {
                            if (err) {
                                reject(err);
                            }
                            const finalize = readFileSync(output);
                            unlinkSync(output);
                            resolve(finalize);
                        }
                    );
                });
            }
            const finalize = readFileSync(output);
            unlinkSync(output);
            return finalize;
        }

        return new Promise((resolve, reject) => {
            Ffmpeg()
                .input(filename)
                .on('error', (err) => {
                    unlinkSync(filename);
                    reject(err);
                })
                .on('end', () => {
                    if (exif) {
                        exec(
                            `webpmux -set exif ${exif} ${output} -o ${output}`,
                            (err) => {
                                if (err) return reject(err);
                                const result = readFileSync(output);
                                unlinkSync(filename);
                                unlinkSync(output);
                                resolve(result);
                            }
                        );
                    } else {
                        const result = readFileSync(output);
                        unlinkSync(filename);
                        unlinkSync(output);
                        resolve(result);
                    }
                })
                .addOutputOptions([
                    '-vcodec',
                    'libwebp',
                    '-vf',
                    "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse"
                ])
                .toFormat('webp')
                .save(output);
        });
    }
};
