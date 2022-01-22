module.exports = class Command {
    constructor (client, config, util) {
        this.command = [];
        this.schedule = [];
        this.global = [];
        this.tags = {};
        this.prefix = config.prefix.map((a) =>
            a instanceof RegExp
                ? a
                : new RegExp(`^(${util.parseRegex(a)})`, 'i')
        );
        this.client = client;
        this.util = util;
        this.config = config;
    }

    on (command, tags, callback, opt = {}) {
        const _command = command.map((a) =>
            a instanceof RegExp
                ? a
                : new RegExp(`^(${this.util.parseRegex(a)})`, 'i')
        );
        const ev = {
            command: command.map((a) => a.toString()),
            enable: true,
            _command,
            callback,
            tags,
            info: 'Tidak Ada Info',
            prefix: true,
            name: command[0].toString(),
            type: 'command',
            ...opt
        };

        for (const a of tags) {
            this.tags[a] = this.tags[a] ? this.tags[a] : [];
            this.tags[a].push(ev);
        }
        ev.index = this[ev.type].length;
        this[ev.type].push(ev);
        this.util.logLoading(`Loading Event | Command ${ev.name}`);
    }

    get (method) {
        const data = {};
        const commands = [];
        this.prefix = this.config.prefix.map((tr) =>
            tr instanceof RegExp
                ? tr
                : new RegExp(`^(${this.util.parseRegex(tr)})`, 'i')
        );
        for (const event of this.command) {
            let prefix;
            if (!event.enable) continue;
            if (event.prefix) {
                prefix =
                    typeof event.prefix === 'boolean'
                        ? this.prefix
                            .filter((tr) => tr.test(method))
                            .sort(
                                (a, b) =>
                                    b.toString().length - a.toString().length
                            )[0]
                        : event.prefix
                            .filter((tr) =>
                                new RegExp(
                                    this.util.parseRegex(tr),
                                    'i'
                                ).test(method)
                            )
                            .sort(
                                (a, b) =>
                                    b.toString().length - a.toString().length
                            )[0];
            } else {
                prefix = /^()/i;
            }
            if (!prefix) continue;
            const noprefixReal = method.replace(prefix, '');
            const noprefix = noprefixReal.toLowerCase();
            const command = event._command
                .filter((tr) => tr.test(noprefix))
                .sort((a, b) => b.toString().length - a.toString().length)[0];
            if (!command) continue;
            commands.push({
                ...event,
                noprefixReal,
                noprefix,
                prefix,
                length: command.toString().length,
                matched: command
            });
        }
        if (commands.length === 0) return {};
        data.event = commands.sort((tr, rt) => rt.length - tr.length)[0];
        data.query = data.event.noprefixReal
            .replace(data.event.matched, '')
            .trim();
        data.command = data.event.noprefix
            .replace(data.query.toLowerCase(), '')
            .trim()
            .toLowerCase();
        data.isUrl = this.util.isUrl(method);
        data.text = method;
        data.prefix = method.toLowerCase().split(data.command)[0];
        data.modify = (obj) => {
            this.command[data.index] = {
                ...this.command[data.event.index],
                ...obj
            };
            return this.command[data.index];
        };
        return data;
    }

    action (method, response, msg = {}) {
        if (typeof method !== 'function') {
            const resultResponse =
                typeof method === 'boolean'
                    ? this.config.response[response]
                    : method.includes('?>')
                        ? `${this.config.response[response]} ${
                            method.split('?>')[1]
                        }`
                        : method;
            if (resultResponse === '--noresp') return 403;
            this.client.reply(
                msg,
                !['wait'].includes(response)
                    ? resultResponse +
                          this.config.response.help.replace(
                              '</prefix>',
                              this.prefix
                          )
                    : resultResponse
            );
            return 403;
        } else {
            return method(this.client, msg) || 403;
        }
    }

    forbidden (msg, event) {
        const ev = event.event;
        if (!msg.isGroup && ev.group) {
            return this.action(ev.group, 'group', msg);
        }
        if (ev.quoted_ && !msg.quotedMsg.isMedia) {
            return this.action(ev.quoted_, 'quoted_', msg);
        }
        if (ev.media__ && !msg.isMedia && !msg.quotedMsg.isMedia) {
            return this.action(ev.media__, 'media__', msg);
        }
        if (ev.media && !msg.isMedia) {
            return this.action(ev.media, 'media', msg);
        }
        if (msg.isGroup && ev.private) {
            return this.action(ev.private, 'private', msg);
        }
        if (ev.wait) this.action(ev.wait, 'wait', msg);
        if (!msg.quotedMsg && ev.quoted) {
            return this.action(ev.quoted, 'quoted', msg);
        }
        if (event.query === '' && ev.query) {
            return this.action(ev.query, 'query', msg);
        }
        if (ev.admin && !msg.sender.admin) {
            return this.action(ev.admin, 'admin', msg);
        }
        if (ev.clientAdmin && !msg.client.admin) {
            return this.action(ev.clientAdmin, 'clientAdmin', msg);
        }
        if (
            ev.owner &&
            !msg.key.fromMe &&
            !this.config.ownerNumber.find((a) => msg.sender.jid.includes(a))
        ) {
            return this.action(ev.owner, 'owner', msg);
        }
        return 200;
    }

    async emit (msg) {
        const ev = this.get(msg.string);
        try {
            this.global.forEach((a) =>
                a.callback(msg, {
                    ...msg,
                    client: this.client,
                    util: this.util,
                    config: this.config
                })
            );
            if (!ev.event) return 0;
            const access = this.forbidden(msg, ev);
            if (access === 200) {
                ev.event.callback(msg, {
                    ...ev,
                    ...msg,
                    client: this.client,
                    util: this.util,
                    config: this.config
                });
            }
            ev.event.before &&
                ev.event.before(msg, {
                    ...ev,
                    ...msg,
                    client: this.client,
                    util: this.util,
                    config: this.config
                });
        } catch (e) {
            if (!this.util.format(e).includes('this.isZero')) {
                const data = {
                    error: this.util.format(e),
                    event: ev
                };
                console.log(data);
                this.action(ev.event.error || true, 'Error', msg);
            }
        }
    }
};
