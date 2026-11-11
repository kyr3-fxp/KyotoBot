#!/bin/sh
set -eu

mkdir -p "$BOT_AUTH_DIR" "$BOT_DATA_DIR"
chown -R node:node /var/data
exec gosu node "$@"
