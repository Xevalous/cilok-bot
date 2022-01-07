/* global cmd config */
cmd.on(
    ['play'],
    ['download'],
    async (msg, { query, client, functions }) => {
        try {
            const yt = require('../../addons/youtube');
            const searchData = (await yt.ytsearch(query.trim())).result.filter(
                (a) => a.isLive === false
            );
            const VData = await yt.ytdownloader(searchData[0].url);
            const AData = await yt.ytdownloader(searchData[0].url, true);
            return client.sendButton(
                msg,
                {
                    image: searchData[0].thumbnail,
                    caption: functions.parseJson(
                        {
                            Title: searchData[0].title,
                            'Uploaded at': searchData[0].uploaded,
                            Views: searchData[0].views,
                            Duration: searchData[0].duration,
                            Channel: searchData[0].author.name,
                            'Link channel': searchData[0].author.url,
                            'Link video': searchData[0].url
                        },
                        {
                            header: 'Youtube play'
                        }
                    ),
                    footer: 'Silahkan pilih opsi di bawah ini',
                    quoted: msg
                },
                [
                    {
                        value: `::cilok:sendmedia ${VData.result.link}|video`,
                        reply: 'Video'
                    },
                    {
                        value: `::cilok:sendmedia ${AData.result.link}|audio`,
                        reply: 'Audio'
                    },
                    {
                        value: `::cilok:sendmedia ${AData.result.link}|document|${AData.result.output}`,
                        reply: 'Document'
                    }
                ]
            );
        } catch (e) {
            return client.throw(msg, 'play', e);
        }
    },
    {
        wait: true,
        query:
            '*REJECTED* | Mau cari musik/video apa kak?' + config.response.help
    }
);

cmd.on(
    ['ytmp3', 'ytmp4'],
    ['download'],
    async (msg, { query, client, command, functions, config, url }) => {
        try {
            if (!url || !query.includes('youtu')) {
                return client.reply(msg, config.response.notUrl);
            }
            const data = await require('../../addons/youtube').ytdownloader(
                query,
                command !== 'ytmp4'
            );
            return client.sendButton(
                msg,
                {
                    image: data.result.thumbnail,
                    caption: functions.parseJson(data.result, {
                        header: 'Youtube downloader',
                        ignoreKey: ['thumbnail', 'output', 'link']
                    }),
                    footer: 'Silahkan pilih opsi di bawah ini',
                    quoted: msg
                },
                [
                    {
                        value: `::cilok:sendmedia ${data.result.link}|${
                            command === 'ytmp4' ? 'video' : 'audio'
                        }`,
                        reply: command === 'ytmp4' ? 'Video' : 'Audio'
                    },
                    {
                        value: `::cilok:sendmedia ${data.result.link}|document|${data.result.output}`,
                        reply: 'Document'
                    }
                ]
            );
        } catch (e) {
            return client.throw(msg, 'ytmp3/ytmp4', e);
        }
    },
    {
        wait: true,
        query: '*REJECTED* | Link youtube nya mana kak?' + config.response.help
    }
);
