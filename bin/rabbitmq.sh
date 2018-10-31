#!/usr/bin/env bash
set -e
source ./bin/_variables.sh

# A helper script to easily run queries / log-in to the Rabbitmq containers
# A proxy for rabbitmqadmin

# Examples:
# ./bin/rabbitmq.sh local list queues name messages
# ./bin/rabbitmq.sh local purge queue name=projectnpm
USAGE="./bin/rabbitmq.sh \"[target]\" [commands...]"
TARGET="${1:-local}"
shift

RABBITMQADMIN_IMAGE="erulabs/rabbitmqadmin"

if ! [ -f "inf/env/${TARGET}/api.env.plain" ]; then
  echo "Target environment \"${TARGET}\" doesnt exist"
  exit 1
fi

# Check for TTY and use interactive mode if we have one
[[ -t 1 ]] && TTY_FLAG="t"

source inf/env/${TARGET}/api.env.plain

DISPLAY_TARGET="${TARGET}"
if [ "${TARGET}" == "prod" ]; then
  read -p "CONNECTING TO PROD | Are you sure? " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]
  then
      exit 1
  fi
  DISPLAY_TARGET="${TARGET}"
fi
echo -e "\nConnecting to \"${DISPLAY_TARGET}\" instance\n"

if [ "${TARGET}" == "local" ]; then
  docker run \
    --rm \
    --network ${PROJECT}_default \
    --link ${PROJECT}_rabbitmq_1:rabbitmq \
    -i${TTY_FLAG} ${RABBITMQADMIN_IMAGE} \
    -u ${RABBITMQ_USER} -p ${RABBITMQ_PASS} -H rabbitmq -P 15672 $@
else
  kubectl run "rabbitmqadmin-$(whoami | awk '{print tolower($0)}')" \
    --restart=Never \
    -i \
    --rm \
    --env="GET_HOSTS_FROM=dns" \
    --image=${RABBITMQADMIN_IMAGE} \
    -- \
    -u ${RABBITMQ_USER} -p ${RABBITMQ_PASS} -H rabbitmq -P 15672 $@
fi
