FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./

# Prisma config requires DATABASE_URL even for generate.
# This value is overridden at runtime by docker-compose.
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stock_saas?schema=public
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm run start:prod"]
