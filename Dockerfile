FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    BOT_AUTH_DIR=/var/data/auth_info \
    BOT_DATA_DIR=/var/data/data

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg gosu ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /var/data/auth_info /var/data/data \
    && chown -R node:node /app /var/data

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
