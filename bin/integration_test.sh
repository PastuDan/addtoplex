#!/usr/bin/env bash
set -e
source ./bin/_variables.sh

TARGET="${1:-local}"
TEST_TARGET="${2:-index.js}"

set -a
source "inf/env/${TARGET}/api.env.plain"
source "inf/env/${TARGET}/worker.env.plain"
[ -f "inf/env/${TARGET}/build.env.plain" ] && source "inf/env/${TARGET}/build.env.plain"
set +a

if [[ ! -d test/integration/${TEST_TARGET} && ! -f test/integration/${TEST_TARGET} ]]; then
  echo "no test named '${TEST_TARGET}'"
  exit 1
fi

# Generate TAG from git commit
if [ -z "${TAG}" ]; then
  COMMIT_HASH=$(git log -1 | head -n1 | awk '{print $2}')
  TAG=$(echo $COMMIT_HASH | cut -c1-7)
fi

if [ "${3}" == "--compose-link" ]; then
  echo "Deploying local integration test container, linking via compose"
  LOCAL_ENV_LOAD=""
  [ -f .env ] && LOCAL_ENV_LOAD="--env-file .env"
  docker run --rm -it \
    --name ${PROJECT}_integration \
    --network ${PROJECT}_default \
    --env-file inf/env/${TARGET}/api.env.plain \
    --env-file inf/env/${TARGET}/worker.env.plain \
    ${LOCAL_ENV_LOAD} \
    -e "POSTGRES_URIS=postgres:5432" \
    -e "RABBITMQ_URIS=rabbitmq:5672" \
    -e "REDIS_RATELIMIT_URIS=redis:6379" \
    -e "REDIS_CACHE_URIS=redis:6379" \
    --link ${PROJECT}_www:www \
    --link ${PROJECT}_api_1:api \
    ${DOCKER_CONTAINER_NAME}:${TAG} \
    ./node_modules/.bin/mocha test/integration/${TEST_TARGET}
elif [ "${TARGET}" == "local" ]; then
  . ./bin/_find_compose_services.sh
  POSTGRES_URIS="${DOCKER_SRV}:${POSTGRES_PORT}" \
  RABBITMQ_URIS="${DOCKER_SRV}:${RABBITMQ_PORT}" \
  REDIS_RATELIMIT_URIS="${DOCKER_SRV}:${REDIS_PORT}" \
  REDIS_CACHE_URIS="${DOCKER_SRV}:${REDIS_PORT}" \
  ./node_modules/.bin/mocha test/integration/${TEST_TARGET}
else
  echo "not supported yet"
  exit 0
fi
