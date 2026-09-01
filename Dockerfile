FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate

RUN pnpm build

EXPOSE 3001

CMD ["node", "dist/main.js"]