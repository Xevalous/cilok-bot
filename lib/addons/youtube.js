const { default: axios } = require('axios');
const { load } = require('cheerio');

exports.ytsearch = async (query = '') => {
    try {
        const requestData = await axios.get(
            `https://www.youtube.com/results?search_query=${encodeURIComponent(
                query.trim()
            )}`,
            {
                headers: {
                    'user-agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36 OPR/81.0.4196.61',
                    'sec-ch-ua':
                        '"Opera GX";v="81", " Not;A Brand";v="99", "Chromium";v="95"'
                }
            }
        );
        const $ = load(requestData.data);
        let parseSearch;
        for (let i = 0; $('script').length > i; i++) {
            if (
                $($('script')[i])
                    .get()[0]
                    .children[0]?.data.includes('var ytInitialData = ')
            ) {
                parseSearch = JSON.parse(
                    $($('script')[i])
                        .get()[0]
                        .children[0].data.split('var ytInitialData = ')[1]
                        .replace(/;/g, '')
                );
            }
        }
        if (typeof parseSearch === 'object') {
            const content =
                parseSearch.contents.twoColumnSearchResultsRenderer
                    .primaryContents.sectionListRenderer.contents;
            const searchData =
                content.length === 2
                    ? content[0].itemSectionRenderer.contents
                    : content[1].itemSectionRenderer.contents;
            const result = [];
            for (const a of searchData) {
                const b = a.videoRenderer;
                if (b) {
                    const prep = {
                        videoId: b.videoId,
                        url: `https://www.youtube.com${b.navigationEndpoint.commandMetadata.webCommandMetadata.url}`,
                        title: b.title.runs[0].text,
                        description: b.detailedMetadataSnippets
                            ? b.detailedMetadataSnippets[0].snippetText.runs[0]
                                .text
                            : 'Unknown',
                        thumbnail:
                            b.thumbnail.thumbnails[1]?.url ??
                            b.thumbnail.thumbnails[0]?.url ??
                            'https://telegra.ph/file/355e8ae7da2299a554eba.jpg',
                        duration:
                            b.thumbnailOverlays[0].thumbnailOverlayTimeStatusRenderer?.text.simpleText.replace(
                                /\./gi,
                                ':'
                            ) ?? 'Unknown',
                        uploaded: b.publishedTimeText?.simpleText ?? 'Unknown',
                        views: isNaN(
                            parseInt(
                                b.viewCountText.simpleText
                                    ?.split(' x ')[0]
                                    .replace(/\./g, '')
                            )
                        )
                            ? 'Unknown'
                            : parseInt(
                                b.viewCountText.simpleText
                                    ?.split(' x ')[0]
                                    .replace(/\./g, '')
                            ),
                        isLive: Object.keys(b).includes('badges')
                            ? !!/live/i.test(
                                b.badges[0].metadataBadgeRenderer.label
                            )
                            : false,
                        author: {
                            name: b.ownerText.runs[0].text,
                            url: `https://www.youtube.com${b.ownerText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}`
                        }
                    };
                    if (
                        Object.keys(b).includes('badges')
                            ? !!/live/i.test(
                                b.badges[0].metadataBadgeRenderer.label
                            )
                            : false
                    ) {
                        delete prep.duration;
                        delete prep.uploaded;
                        delete prep.views;
                    }
                    result.push(prep);
                }
            }
            return {
                status: requestData.status,
                author: 'VEXG',
                result
            };
        } else {
            return {
                status: 500,
                author: 'VEXG'
            };
        }
    } catch (e) {
        throw e;
    }
};

exports.ytdownloader = async (url = '', mp3 = false) => {
    try {
        const config = mp3
            ? '#mp3 > table > tbody > tr'
            : '#mp4 > table > tbody > tr:nth-child(3)';
        const videoId =
            /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\\-nocookie|)\.com\/(?:watch\?.*(?:|\\&)v=|embed\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/.exec(
                url
            )[1];
        const requestData = await axios.post(
            'https://www.y2mate.com/mates/en68/analyze/ajax',
            new URLSearchParams(
                Object.entries({
                    url,
                    q_auto: 0,
                    ajax: 1
                })
            ),
            {
                headers: {
                    'user-agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36 OPR/81.0.4196.61',
                    'sec-ch-ua':
                        '"Opera GX";v="81", " Not;A Brand";v="99", "Chromium";v="95"'
                }
            }
        );
        if (requestData.data?.result) {
            const $ = load(requestData.data.result);
            const prep = {
                status: requestData.status,
                author: 'Zbin remastered by VEXG',
                result: {
                    title: $('div').find('.thumbnail.cover > div > b').text(),
                    quality: $('div')
                        .find(`${config} > td:nth-child(3) > a`)
                        .attr('data-fquality'),
                    size: $('div').find(`${config} > td:nth-child(2)`).text(),
                    thumbnail: $('div')
                        .find('.thumbnail.cover > a > img')
                        .attr('src'),
                    output: `${videoId}.${$('div')
                        .find(`${config} > td:nth-child(3) > a`)
                        .attr('data-ftype')}`
                }
            };
            const requestConvert = await axios.post(
                'https://www.y2mate.com/mates/en68/convert',
                new URLSearchParams(
                    Object.entries({
                        type: 'youtube',
                        _id: /var k__id = "(.*?)"/.exec(
                            requestData.data.result
                        )[1],
                        v_id: videoId,
                        ajax: 1,
                        token: '',
                        ftype: prep.result.output.split('.')[1],
                        fquality: prep.result.quality
                    })
                ),
                {
                    headers: {
                        'user-agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36 OPR/81.0.4196.61',
                        'sec-ch-ua':
                            '"Opera GX";v="81", " Not;A Brand";v="99", "Chromium";v="95"'
                    }
                }
            );
            const $convert = load(requestConvert.data.result);
            prep.result.link = $convert('div').find('a').attr('href');
            return prep;
        }
    } catch (e) {
        throw e;
    }
};
