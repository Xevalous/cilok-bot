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
            const mediaV = await yt.ytdownloader(searchData[0].url);
            const mediaA = await yt.ytdownloader(searchData[0].url, true);
            const desc = functions.parseJson(
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
            );
            return client.sendButton(
                msg,
                {
                    image: searchData[0].thumbnail,
                    caption: desc,
                    footer: 'Silahkan pilih opsi di bawah ini, untuk pengguna IOS disarankan memilih opsi document',
                    quoted: msg
                },
                [
                    {
                        value: `::cilok:sendmedia ${mediaV.result.link}|video`,
                        reply: 'Video'
                    },
                    {
                        value: `::cilok:sendmedia ${mediaA.result.link}|audio`,
                        reply: 'Audio'
                    },
                    {
                        value: `::cilok:sendmedia ${mediaA.result.link}|document|${mediaA.result.output}`,
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
