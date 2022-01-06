#!/usr/bin/bash
echo "Starting Installation..."
apt-get update && apt-get upgrade
apt-get install git libwebp ffmpeg nodejs
npm i pnpm -g
pnpm install -P
echo "Installation Complete!"