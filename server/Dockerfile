FROM oven/bun:1-debian AS base
WORKDIR /app

# Install yt-dlp and ffmpeg
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 ffmpeg curl ca-certificates && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY server/package.json server/bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY server/ .

EXPOSE 8080

CMD ["bun", "run", "index.ts"]
