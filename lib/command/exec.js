/* global cmd config */
cmd.on(
    ['::cilok:sendmedia'],
    ['hidden'],
    async (msg, { query, client }) => {
        try {
            const q = query.split('|');
            return await client.send(msg, {
                [q[1]]: q[0],
                filename: q[2],
                quoted: msg
            });
        } catch (e) {
            return client.throw(msg, '::cilok:sendMedia', e);
        }
    },
    {
        wait: true,
        query: config.response.error,
        prefix: false
    }
);
