# Cilok-Bot - MD

## Documentation
https://vexg.github.io/cilok-v3/




## Installation
#### Note
- This source code using [pnpm](https://pnpm.io/) as primary dependencies manager. [Learn more](https://pnpm.io/motivation)
- You can skip this section if you using heroku.

### Requirements (Skip this section if you are using linux)
- [Node.js](https://nodejs.org/en/)
- [Ffmpeg](https://github.com/BtbN/FFmpeg-Builds/releases)
- [Libwebp](https://storage.googleapis.com/downloads.webmproject.org/releases/webp/index.html)

### For Linux
```
bash ./src/install.sh
```
### For Windows
```
start ./src/install.bat
```
## Heroku
### Buildpacks
- heroku/nodejs
- https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git
- https://github.com/clhuang/heroku-buildpack-webp-binaries.git
 
## Starting the BOT
### Config
- From "-.env" rename to ".env" in ```src``` and fill the value in that file.
- Fill your client number (Optional) & your other / primary number in [```config.json```](https://github.com/VEXG/cilok-v2-md/blob/f93ce0ec32b83ccc1f99f552346632808a6a33ae/src/cilok.config.json#L4) to validate that you're the owner of the bot & you can change the response message, unicode, etc if you want to.

### Run the BOT
 - run this command in your terminal
    - production
        ```
        pnpm build && pnpm start
        ```
    - development
        ```
        pnpm dev
        ```
- scan the QR to make a session. session, chats will be stored in ```src/database```
- there will be some logs spamming because the logger level is set to ```info```, you can change the value to ```silent``` in [here](https://github.com/VEXG/cilok-v2-md/blob/f93ce0ec32b83ccc1f99f552346632808a6a33ae/lib/connection.ts#L19) to hide the spamming logs. [Learn more](https://github.com/pinojs/pino/blob/master/docs/api.md#loggerlevels-object)