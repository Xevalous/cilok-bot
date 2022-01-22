/* global client, database, session, pgDb, util */

// eslint-disable-next-line no-unused-vars
let alreadyConnected = false;
database.saveOn = database.saveOn ?? 1;

client.ev.on('connection.update', async (update) => {
    if (update.connection === 'open') {
        alreadyConnected = true;
    } else if (update.connection === 'close') {
        const status = update.lastDisconnect?.error?.output?.statusCode;
        if (status === 401) {
            return process.send('reset');
        } else if (status === 403) {
            delete database.session;
            util.fs.unlinkSync('./src/json/session.json');
            return process.send('reset');
        }
    }
});

client.ev.on('creds.update', session.saveState);

client.ev.on('creds.update', async () => {
    console.log(`Save on progress: ${database.saveOn} / 50`);
    if (database.saveOn % 50 === 0) {
        if (process.env?.PG) {
            util.logPg();
            database.chats =
                typeof database.chats === 'object'
                    ? Buffer.from(JSON.stringify(database.chats)).toString(
                        'base64'
                    )
                    : database.chats;
            await pgDb.query(
                `UPDATE Database SET object='${JSON.stringify(database)}';`
            );
            database.saveOn = 1;
            if (Object.keys(util.spinnies.spinners).includes('PG')) {
                util.spinnies.succeed('PG', {
                    text: 'Succesfully saving database to PgSql'
                });
            }
        }
    }
    database.saveOn += 1;
});
