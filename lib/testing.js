const i = async () => {
    const templateButtons = [
        {
            url: {
                text: '⭐ Star Baileys on GitHub!',
                url: 'https://github.com/adiwajshing/Baileys'
            }
        },
        { call: { text: 'Call me!', number: '+1 (234) 5678-901' } },
        {
            reply: {
                text: 'This is a reply, just like normal buttons!',
                id: 'id-like-buttons-message'
            }
        }
    ];
    const hasil = templateButtons.map((a) => {
        const key = Object.keys(a)[0];
        if (key.includes('reply')) {
            a.quickReplyButton = a[key];
        } else {
            a[`${key}Button`] = a[key];
        }
        delete a[key];
        return a;
    });
    console.log(hasil);
};

console.log(i());
