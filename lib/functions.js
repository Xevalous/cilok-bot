const fs = require('fs');
const pg = require('pg');
const util = require('util');
const chalk = require('chalk');
const Ffmpeg = require('fluent-ffmpeg');
const Command = require('./command');
const baileys = require('@adiwajshing/baileys-md');
const Spinnies = require('spinnies');
const fileType = require('file-type');
const WAconnection = require('./WAconnection');
const { exec } = require('child_process');
const { default: axios } = require('axios');

module.exports = class Functions {
    constructor () {
        this.fs = fs;
        this.util = util;
        this.exec = exec;
        this.axios = axios;
        this.chalk = chalk;
        this.ffmpeg = Ffmpeg;
        this.fileType = fileType;
        this.spinnies = new Spinnies();
    }

    parseRegex (text = '') {
        return text.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
    }

    readmore (number = 0) {
        return String.fromCharCode(8206).repeat(number);
    }

    pad (number = 0) {
        return (number < 10 ? '0' : '') + number;
    }

    delay (ms = 0) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    wings (text = '') {
        return `${global.config.unicode.wings[0]}*${text.trim()}*${
            global.config.unicode.wings[1]
        }`;
    }

    isUrl (text = '') {
        return text.match(
            /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi
        );
    }

    randomSelectArray (array = []) {
        if (array instanceof Array) {
            return array[Math.floor(Math.random() * array.length)];
        } else if (typeof array === 'number') {
            return Math.floor(Math.random() * array);
        }
    }

    parseMention (text = '') {
        try {
            return (
                text
                    .match(/@(\d*)/g)
                    .map((x) => `${x.replace('@', '')}@s.whatsapp.net`) || []
            );
        } catch (e) {
            return [];
        }
    }

    parseJson (json, options = {}) {
        if (Object.entries(json).length === 0) {
            return new Error('No json input provided');
        }
        const opt = {
            ignoreValue: [null, undefined],
            ignoreKey: [],
            header: '',
            body: `${global.config.unicode.list} *%key :* %value`,
            footer: '------------',
            preResult: false,
            ...options
        };
        const content = [];
        for (const [a, b] of Object.entries(json)) {
            if (opt.ignoreValue.indexOf(b) !== -1) continue;
            const key = a[0].toUpperCase() + a.slice(1);
            const type = typeof b;
            if (opt.ignoreKey && opt.ignoreKey.includes(a)) continue;
            switch (type) {
            case 'boolean':
                content.push([key, b ? 'Ya' : 'Tidak']);
                break;
            case 'object':
                if (Array.isArray(b)) {
                    content.push([key, b.join(', ')]);
                } else {
                    content.push([
                        key,
                        this.parseJson(b, {
                            ignoreKey: opt.ignoreKey,
                            preResult: true
                        })
                    ]);
                }
                break;
            default:
                content.push([key, b]);
                break;
            }
        }
        if (opt.preResult) return content;
        const compile = [
            opt.header === ''
                ? '' + '\n'
                : `${global.config.unicode.wings[0]}*${opt.header}*${global.config.unicode.wings[1]}\n`,
            content
                .map((a) => {
                    return opt.body
                        .replace(/%key/g, a[0])
                        .replace(/%value/g, a[1]);
                })
                .join('\n'),
            Array.isArray(json) ? `\n\n${opt.footer}\n` : ''
        ];
        return compile.join('');
    }

    async metadataMsg (client, msg) {
        const chatMeta = async (mess) => {
            mess.sender = {};
            mess.realType = Object.keys(mess.message)[0];
            mess.message =
                mess.realType === 'ephemeralMessage'
                    ? mess.message.ephemeralMessage.message
                    : mess.message;
            mess.message =
                mess.realType === 'viewOnceMessage'
                    ? mess.message[mess.realType].message
                    : mess.message;
            mess.type = Object.keys(mess.message).find((tr) => {
                const v = tr.toString().toLowerCase();
                return !v.includes('senderkey') && !v.includes('context');
            });
            mess.data =
                typeof mess.message[mess.type] === 'object'
                    ? Object.keys(mess.message[mess.type]).includes(
                        'contextInfo'
                    )
                        ? Object.keys(mess.message[mess.type]).concat(
                            Object.keys(mess.message[mess.type].contextInfo)
                        )
                        : Object.keys(mess.message[mess.type])
                    : Object.keys(mess.message);
            mess.string =
                mess.type === 'conversation'
                    ? mess.message.conversation
                    : mess.data.includes('caption')
                        ? mess.message[mess.type].caption
                        : mess.type === 'extendedTextMessage'
                            ? mess.message[mess.type].text
                            : mess.type === 'templateButtonReplyMessage'
                                ? mess.message[mess.type].selectedId
                                : mess.type === 'listResponseMessage'
                                    ? mess.message[mess.type].singleSelectReply.selectedRowId
                                    : '';
            mess.body = mess.message[mess.type];
            mess.from = mess.key.remoteJid;
            mess.isGroup = mess.from.endsWith('g.us');
            mess.sender.jid = mess.isGroup
                ? mess.key.participant
                    ? mess.key.participant
                    : client.user.jid
                : mess.key.remoteJid;
            mess.sender.name = mess.pushName;
            mess.client = {};
            mess.client.name = client.user.name;
            mess.client.jid = client.user.id.split(':')[0] + '@s.whatsapp.net';
            mess.mentionedJid =
                mess.data.includes('contextInfo') &&
                mess.data.includes('mentionedJid')
                    ? mess.message[mess.type].contextInfo.mentionedJid
                    : false;
            mess.isText =
                mess.type === 'conversation' ||
                mess.type === 'extendedTextMessage';
            mess.isMedia = !mess.isText;
            mess.id = mess.key.id;
            mess.fromMe = mess.key.fromMe;
            mess.quotedMsg =
                mess.data.includes('contextInfo') &&
                mess.data.includes('quotedMessage')
                    ? {
                        key: {
                            remoteJid: mess.from,
                            fromMe:
                                  mess.message[mess.type].contextInfo
                                      .participant === client.user.jid,
                            id: mess.message[mess.type].contextInfo.stanzaId,
                            participant:
                                  mess.message[mess.type].contextInfo
                                      .participant
                        },
                        message:
                              mess.message[mess.type].contextInfo.quotedMessage
                    }
                    : false;
            mess.isOwner = mess.key.fromMe;
            mess.groupData = mess.isGroup
                ? await client.groupMetadata(mess.from)
                : false;
            if (mess.groupData) {
                mess.sender = {
                    ...mess.sender,
                    ...mess.groupData.participants.find(
                        (tr) => tr.id === mess.sender.jid
                    )
                };
                mess.client = {
                    ...mess.client,
                    ...mess.groupData.participants.find(
                        (tr) => tr.id === mess.client.jid
                    )
                };
            }
            mess.downloadMsg = async (filename) => {
                return await client.downloadMessage(mess.message, filename);
            };
            mess.deleteMsg = async (forAll) => {
                if (forAll) {
                    return await client.deleteMessage(
                        mess.key.remoteJid,
                        mess.key
                    );
                }
                return await client.clearMessage(mess.key);
            };
            mess.resendMsg = async (mes, opt) => {
                return await client.sendMessageFromContent(
                    mes,
                    mess.message,
                    opt
                );
            };
            mess.quotedMsg = mess.quotedMsg
                ? await chatMeta(mess.quotedMsg)
                : false;
            return mess;
        };
        return await chatMeta(msg);
    }

    async run () {
        try {
            console.clear();
            console.log(chalk.green('Starting running bot......'));
            await this.delay(3000);
            console.clear();
            console.log(
                chalk.cyan.bold(fs.readFileSync('./src/loader.txt').toString())
            );
            const getWAWebVer = (
                await this.axios.get(
                    'https://web.whatsapp.com/check-update?version=1&platform=web'
                )
            ).data;
            global.baileys = baileys;
            global.functions = this;
            global.session = baileys.useSingleFileAuthState(
                './src/database/session.json'
            );
            global.config = require('../src/cilok.config.json');
            global.client = new WAconnection(
                baileys.default({
                    auth: global.session.state,
                    printQRInTerminal: true,
                    browser: ['cilok-v2-md', 'Desktop', '2.0.01'],
                    version: getWAWebVer
                        ? [
                            Number(getWAWebVer.currentVersion.split('.')[0]),
                            Number(getWAWebVer.currentVersion.split('.')[1]),
                            Number(getWAWebVer.currentVersion.split('.')[2])
                        ]
                        : [2, 2140, 12],
                    // Change level from 'silent' to 'info' if u want show some advance info logger
                    logger: require('pino')({
                        level: 'silent'
                    })
                })
            );
            global.pgDb = process.env?.PG
                ? new pg.Pool(JSON.parse(process.env.PG))
                : undefined;
            if (global.pgDb) {
                this.logPg();
                const query = (
                    await global.pgDb.query(
                        'CREATE TABLE IF NOT EXISTS Database(object json);SELECT * FROM Database'
                    )
                )[1].rows[0];
                if (!query || !('object' in query)) {
                    await global.pgDb.query(
                        "INSERT INTO Database(object) VALUES('{}');"
                    );
                    global.database = {};
                } else {
                    for (const a in query.object) {
                        fs.writeFileSync(
                            './src/database/' + a + '.json',
                            JSON.stringify(query.object[a])
                        );
                    }
                    global.database = query.object;
                }
                this.spinnies.succeed('PG', {
                    text: 'Succesfully saving database to PgSql'
                });
            } else {
                global.database = {};
                for (const a of fs.readdirSync('./src/database/')) {
                    global.database[
                        a.replace('.json', '')
                    ] = require(`../src/database/${a}`);
                }
            }
            global.cmd = new Command(
                global.client,
                global.config,
                global.functions
            );
            for (const a of fs.readdirSync('./lib/command')) {
                require(`./command/${a}`);
            }
            for (const b of fs.readdirSync('./lib/event')) {
                require(`./event/${b}`);
            }
            await this.delay(1000);
            this.spinnies.succeed('Loading', {
                text: 'Checking and adding new command success'
            });
            console.log(chalk.green('✓ Connected!'));
        } catch (e) {
            console.log({
                error: e,
                path: __dirname
            });
        }
    }

    // Ignore this
    logLoading (text = '') {
        if (!Object.keys(this.spinnies.spinners).includes('Loading')) {
            this.spinnies.add('Loading', { text });
        } else {
            this.spinnies.update('Loading', { text });
        }
    }

    logPg () {
        this.spinnies.add('PG', { text: 'Saving database to PgSql...' });
    }
};
