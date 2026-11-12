FROM oven/bun:1.4.0 AS bun
FROM postgres:18.1
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app/core/runtime
COPY core/runtime/package.json core/runtime/bun.lock ./
RUN bun install --frozen-lockfile
RUN apt-get update && apt-get install -y --no-install-recommends chromium && rm -rf /var/lib/apt/lists/*
COPY core/runtime/ ./
RUN chown -R postgres:postgres /app
USER postgres
ENTRYPOINT []
CMD ["bun", "scripts/temporary-event-release.ts"]
