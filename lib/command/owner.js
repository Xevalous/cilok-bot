/* global cmd, util */

cmd.on(
    ['>>', '=>>'],
    ['owner'],
    async (msg, { client, command, text }) => {
        const parse = command.includes('=>>')
            ? text.replace('=>>', 'return ')
            : text.replace('>>', '');
        try {
            // eslint-disable-next-line no-eval
            const evaluate = await eval(`;(async () => {${parse} })()`).catch(
                (e) => {
                    return client.reply(msg, e);
                }
            );
            return client.reply(msg, evaluate);
        } catch (e) {
            return client.reply(msg, e);
        }
    },
    {
        owner: '--noresp',
        prefix: false
    }
);

cmd.on(
    ['$$'],
    ['owner'],
    async (msg, { query, client }) => {
        try {
            util.exec(`${query}`, (err, out) => {
                if (err) return client.reply(msg, err);
                client.reply(msg, out);
            });
        } catch (e) {
            return client.reply(msg, e);
        }
    },
    {
        owner: '--noresp',
        prefix: false
    }
);
