#!/usr/bin/bash
sudo apt-get update 
sudo apt-get upgrade
echo "CILOK | Starting Installation..."
sudo apt-get install libwebp ffmpeg nodejs npm
npm i pnpm -g
pnpm i yarn -g
pnpm install
pnpm i ts-node -g
echo "CILOK | Installation complete"