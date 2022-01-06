try {
    new (require('./lib/functions.js'))().run();
    process.on('uncaugtException', console.error);
} catch (e) {
    console.error({
        e,
        path: __dirname
    });
}
