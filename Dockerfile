# =========================
# Build stage
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# Reuse Node's bundled headers for native dependencies instead of downloading
# them during the image build.
ENV npm_config_nodedir=/usr/local

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# argon2 contains a native module. Alpine needs this toolchain during install.
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate

RUN pnpm build


# =========================
# Production stage
# =========================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV npm_config_nodedir=/usr/local

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Keep the native runtime libraries but remove build tools after argon2 compiles.
RUN apk add --no-cache libstdc++ \
    && apk add --no-cache --virtual .build-deps python3 make g++ \
    && pnpm install --frozen-lockfile --prod \
    && apk del .build-deps

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["sh", "-c", "pnpm db:migrate:deploy && node dist/src/main.js"]
