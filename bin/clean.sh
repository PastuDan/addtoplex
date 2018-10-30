#!/usr/bin/env bash
source ./bin/_variables.sh

# Deletes artifacts, resets the directory/development station to sanity
# Use 'hard` to delete all containers, soft to just delete built code

USAGE="./bin/clean [hard|soft]"

if [ -z $1 ] || [ "$1" == "soft" ]; then
  echo "Soft cleaning..."
  rm -rf _build
elif [ "$1" == "hard" ]; then
  echo "Hard cleaning..."
  WWW_CONTAINER=$(docker ps -q -f name=addtoplex_www)
  [ ! -z "$WWW_CONTAINER" ] && docker kill ${WWW_CONTAINER}
  UAT_CONTAINER=$(docker ps -q -f name=addtoplex_uat)
  [ ! -z "$UAT_CONTAINER" ] && docker kill ${UAT_CONTAINER}
  INTEGRATION_CONTAINER=$(docker ps -q -f name=addtoplex_integration)
  [ ! -z "$INTEGRATION_CONTAINER" ] && docker kill ${INTEGRATION_CONTAINER}

  DOCKER_CONTAINER_NAME=${DOCKER_CONTAINER_NAME} TAG=${TAG:-"dev"} TARGET=${TARGET:-"local"} docker-compose -p ${PROJECT} down --remove-orphans
  rm -rf _db _build .devlog.plain
else
  echo $USAGE
  exit 1
fi
