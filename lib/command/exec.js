/* global cmd config */
cmd.on(
    ['::cilok:sendmedia'],
    ['hidden'],
    async (msg, { query, client }) => {
        try {
            let template = {};
            const q = query.split('|');
            switch (q[1]) {
            case 'video':
                template = {
                    video: q[0],
                    quoted: msg
                };
                break;
            case 'audio':
                template = {
                    audio: q[0],
                    quoted: msg,
                    mimetype: 'audio/mp4'
                };
                break;
            case 'document':
                template = {
                    document: q[0],
                    filename: q[2]
                };
                break;
            }
            return await client.send(msg, template);
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
