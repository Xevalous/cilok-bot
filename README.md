# Cilok-Bot 2.0.1 - MD

## Documentation
https://vexg.github.io/cilok-v2-md/

## Requirements
- [Node.js](https://nodejs.org/en/)
- [Ffmpeg](https://github.com/BtbN/FFmpeg-Builds/releases)
- [Libwebp](https://storage.googleapis.com/downloads.webmproject.org/releases/webp/index.html)


## Installation
### Note
This source code using [pnpm](https://pnpm.io/) for dependencies manager. [Learn more](https://pnpm.io/motivation)
### For Linux
```
bash ./src/install.sh
```
### For Windows
```
start ./src/install.bat
```
 
## Starting the BOT
### Before start
- From "-.env" rename to ".env" in ```src directory``` and fill the value in that file.
- Fill your client number ( optional ) & your other / primary number in [```cilok.config.json```](https://github.com/VEXG/cilok-v2-md/blob/f93ce0ec32b83ccc1f99f552346632808a6a33ae/src/cilok.config.json#L4) to validate that you're the owner of the bot. You can change the response message, unicode, etc.

### Run the BOT
 - run this command in your terminal
```
pnpm start
```
- scan the QR to make a session, session, chats will be stored in ```./src/database/```
- there will be some logs spamming because the logger level is set to ```info```, you can change the value to ```silent``` in [here](https://github.com/VEXG/cilok-v2-md/blob/f93ce0ec32b83ccc1f99f552346632808a6a33ae/lib/connection.ts#L19) to hide the spamming logs. [Learn more](https://github.com/pinojs/pino/blob/master/docs/api.md#loggerlevels-object)
- Done! you are successfully running the BOT. Type ```>>``` in your chat to make sure its running perfectly ( make sure you're the owner of the bot )