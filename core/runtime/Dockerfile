FROM oven/bun:1.4.0
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
USER bun
CMD ["bun", "server.ts"]
