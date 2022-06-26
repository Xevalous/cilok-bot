FROM node:14.19.1
WORKDIR /app/
RUN apt-get update && apt-get install ffmpeg webp -y
COPY package*.json ./
RUN npm install pnpm
RUN pnpm install -P
RUN pnpm build
COPY . . 
CMD pnpm start
