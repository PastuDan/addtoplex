#!/usr/bin/env bash
set -e
source ./bin/_variables.sh
TARGET="${1:-local}"
if [ -z "${TAG}" ]; then
  COMMIT_HASH=$(git log -1 | head -n1 | awk '{print $2}')
  TAG=$(echo $COMMIT_HASH | cut -c1-7)
fi

set -a
source "inf/env/${TARGET}/api.env.plain"
source "inf/env/${TARGET}/worker.env.plain"
[ -f "inf/env/${TARGET}/build.env.plain" ] && source "inf/env/${TARGET}/build.env.plain"
set +a

mkdir -p tmp/uat

if [ -z ${WWW_TARGET} ]; then
  if [ "${2}" == "--compose-link" ]; then
    WWW_TARGET="https://www:4443"
  elif [ "${local}" == "local" ]; then
    WWW_TARGET="https://localhost:3000"
  else
    WWW_TARGET=${API_CORS_ALLOWED_ORIGINS}
  fi
fi

TEST_TIMEOUT=300

if [ "${2}" == "--compose-link" ]; then
  echo "Deploying local UAT test container, linking via compose"
  docker run -it \
    --name ${PROJECT}_uat \
    --network ${PROJECT}_default \
    --link ${PROJECT}_www:www \
    --link ${PROJECT}_api_1:api \
    -e "WWW_TARGET=${WWW_TARGET}" \
    -e "CHROME_IN_DOCKER=true" \
    ${DOCKER_CONTAINER_NAME}:${TAG} \
    timeout -t ${TEST_TIMEOUT} node test/uat

  docker cp ${PROJECT}_uat:/app/tmp/uat/. tmp/uat/
  docker rm ${PROJECT}_uat
else
  node test/uat
fi
