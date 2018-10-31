#!/usr/bin/env bash
set -e

# Builds the project! That's basically just: Yarn, Gulp, Docker
# in that order with some helpers :)

# Usage: ./bin/build.sh [tag]
# if no [tag] is provided, containers will not be built

START_TIME=$(date +%s)

# Generate .release file information
AUTHOR=$(git log -1 | fgrep Author | sed 's/Author:\ //' | awk '{print $1}')
COMMIT_MSG=$(git log -1 | cat | tail -n +5 | sed "s/^    //" | tr '\n' ' ' | sed 's/[ \t]*$//')
COMMIT_HASH=$(git log -1 | head -n1 | awk '{print $2}')
COMMIT_SHORT=$(echo $COMMIT_HASH | cut -c1-7)
RELEASE_TEXT="$COMMIT_SHORT: $AUTHOR '$COMMIT_MSG'"
TARGET=${1:-"local"}
TAG=${2:-${COMMIT_SHORT}}
source ./bin/_variables.sh

echo "-> Building '${TAG}' for '${TARGET}'"
yarn --no-progress --no-emoji --prefer-offline

if [ -z ${SKIP_IMAGES} ]; then
  echo -e "\n\n-> Building \"${DOCKER_CONTAINER_NAME}:${TAG}\": ${RELEASE_TEXT}"
  echo -n "${RELEASE_TEXT}" > ./.release
  generateSelfSignedCerts
  if [ ! -z ${CI} ]; then
    docker pull ${DOCKER_CONTAINER_NAME}:latest || true
    docker build --cache-from ${DOCKER_CONTAINER_NAME}:latest -t ${DOCKER_CONTAINER_NAME}:${TAG} .
  else
    docker build -t ${DOCKER_CONTAINER_NAME}:${TAG} .
  fi
  docker tag ${DOCKER_CONTAINER_NAME}:${TAG} ${DOCKER_CONTAINER_NAME}:latest
else
  echo "SKIP_IMAGES set, not building containers."
fi

if [ -z ${SKIP_WWW} ]; then
  set -a
  source "inf/env/${TARGET}/www.env.plain"
  set +a
  node scripts/build.js
else
  echo "SKIP_WWW set, not building app."
fi

echo -e "\n\n-> Build done in $(($(date +%s) - $START_TIME)) seconds"
