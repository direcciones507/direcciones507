FROM oven/bun:1.4.0
WORKDIR /app/core/runtime
COPY core/runtime/package.json core/runtime/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY core/runtime/ ./
COPY core/postgres/ ../postgres/
COPY ad507.template.html /app/ad507.template.html
USER bun
CMD ["bun", "server.ts"]
