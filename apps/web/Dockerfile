FROM node:20-bookworm-slim

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

CMD ["pnpm", "dev"]
