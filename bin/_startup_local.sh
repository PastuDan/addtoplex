#!/usr/bin/env bash
source ./bin/_variables.sh

# This script launches all backend services (databases, queues, etc) and waits for them to be ready
# It's only really called "_local" because it assumes everything will run on one machine :)

if ! [ -f "package.json" ]; then
  error "This script needs to be run from the root of the repository"
fi
if [[ "$@" =~ .*\-\-clean.* ]]; then
  ./bin/clean.sh hard
fi

generateSelfSignedCerts

SERVICES_TO_START=${SERVICES_TO_START:-""}
NODE_ENV="development" yarn --no-progress --no-emoji --prefer-offline

COMPOSE_CMD="docker-compose -p '${PROJECT}' up -d --remove-orphans ${SERVICES_TO_START} redis"

DOCKER_CONTAINER_NAME=${DOCKER_CONTAINER_NAME} \
TAG=${TAG:-:"dev"} \
TARGET=${TARGET:-"local"} \
docker-compose -p "${PROJECT}" build

echo "$COMPOSE_CMD"

set -e
DOCKER_CONTAINER_NAME=${DOCKER_CONTAINER_NAME} \
TAG=${TAG:-:"dev"} \
TARGET=${TARGET:-"local"} \
${COMPOSE_CMD} 2>&1 | tee .devlog.plain
. ./bin/_find_compose_services.sh

if fgrep "Creating " .devlog.plain > /dev/null; then
  echo "Waiting for services to be ready"
  sleep 5
fi
