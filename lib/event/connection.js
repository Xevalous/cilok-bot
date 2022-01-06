/* global client, database, session, pgDb, functions */

// eslint-disable-next-line no-unused-vars
let alreadyConnected = false;
global.database.saveOn = database.saveOn || 0;

client.ev.on('creds.update', session.saveState);

client.ev.on('connection.update', async (update) => {
    if (update.connection === 'open') {
        alreadyConnected = true;
    } else if (
        update.connection === 'close' &&
        update.lastDisconnect?.error?.output?.statusCode !== 401
    ) {
        process.send('reset');
    }
});

client.ev.on('creds.update', async () => {
    if (database.saveOn % 50 === 0) {
        if (process.env?.PG) {
            functions.logPg();
            delete database.chat;
            await pgDb.query(
                `UPDATE Database SET object='${JSON.stringify(database)}';`
            );
            if (Object.keys(functions.spinnies.spinners).includes('PG')) {
                functions.spinnies.succeed('PG', {
                    text: 'Succesfully saving database to PgSql'
                });
                database.saveOn = 0;
            }
        }
    }
    database.saveOn++;
});
