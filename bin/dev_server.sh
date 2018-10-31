#!/usr/bin/env bash
set -e
source ./bin/_variables.sh
source ./bin/_startup_local.sh

rm -f .release
TARGET="${TARGET:=local}"

set -a
source "inf/env/${TARGET}/api.env.plain"
set +a

readEnvFile

REDIS_RATELIMIT_URIS="${DOCKER_SRV}:${REDIS_PORT}" \
REDIS_CACHE_URIS="${DOCKER_SRV}:${REDIS_PORT}" \
./node_modules/.bin/nodemon --inspect --ignore src/ api/index.js
