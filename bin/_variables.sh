#!/usr/bin/env bash

PROJECT="addtoplex"
PROJECT_DOMAIN="addtoplex.app"

function readEnvFile {
  ENVFILE="inf/env/${TARGET:-local}/build.env.plain"
  set -a
  [ -f $ENVFILE ] && source $ENVFILE
  [ -f '.env' ] && source '.env'
  set +a
  DOCKER_CONTAINER_NAME=${DOCKER_CONTAINER_NAME:-"addtoplex"}
}

function error {
  echo "$1"
  exit 1
}

function generateSelfSignedCerts  {
  if ! [ -f "secrets/selfsigned.key.pem" ]; then
    echo "Development key/cert missing. Generating now..."
    ./bin/generate_self_signed_cert.sh
  fi
}

function discordPost {
  if [ ! -z "$DISCORD_WEBHOOK" ]; then
    MSG=$(echo "${1}" | tr '\n' ' ')
    curl \
      -H "Content-Type: application/json" \
      -X POST \
      -d "{\"username\": \"DeployBot\", \"content\": \"${MSG}\"}" \
      ${DISCORD_WEBHOOK}
  fi
}

readEnvFile
