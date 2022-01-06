const path = require('path');
const { Pool } = require('pg');
const { spawn } = require('child_process');
const { watchFile, unwatchFile, readdirSync } = require('fs');
let isRunning = false;

function start (file = '') {
    if (isRunning) return;
    isRunning = true;
    require('dotenv').config({
        path: './src/.env'
    });
    const pgDb = new Pool(JSON.parse(process.env?.PG));
    const pathFile = [path.join(__dirname, file), ...process.argv.slice(2)];
    const run = spawn(process.argv0, pathFile, {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });
    run.on('uncaugtException', console.log);
    run.on('message', (data) => {
        switch (data) {
        case 'reset':
            run.kill();
            isRunning = false;
            start.apply(this, arguments);
            break;
        case 'uptime':
            run.send(process.uptime());
            break;
        case 'close':
            run.kill();
            process.kill(0);
            break;
        }
    });
    run.on('exit', async (code) => {
        if (process.env?.PG) {
            const db = {};
            for (const a of readdirSync('./src/database/')) {
                db[a.replace('.json', '')] = require(`./src/database/${a}`);
            }
            delete db?.chat;
            await pgDb.query(
                `UPDATE Database SET object='${JSON.stringify(db)}';`
            );
            console.log(
                'Succesfully saving database to PgSql (Crashed action)'
            );
        }
        isRunning = false;
        if (code === 1) return process.kill(0);
        console.error('Exited with code:', code);
        watchFile(pathFile[0], () => {
            unwatchFile(pathFile[0]);
            start(file);
        });
    });
}

try {
    start('app.js');
} catch (e) {
    console.error({
        e,
        path: __dirname
    });
}
