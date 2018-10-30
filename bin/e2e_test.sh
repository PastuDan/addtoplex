#!/usr/bin/env bash
source ./bin/_variables.sh
set -e

# High level wrapper to test the living service
# Note that this script either requires a modern version of Curl (~>7.61.0) or Docker and the --compose-link option

TARGET="${1:-local}"
set -a
source ./inf/env/$TARGET/www.env.plain
source ./inf/env/$TARGET/api.env.plain
set +a
[ -z ${API_TARGET} ] && API_TARGET=${REACT_APP_API_HOST}
[ -z ${WWW_TARGET} ] && WWW_TARGET=${API_CORS_ALLOWED_ORIGINS}
SKIP_INTEGRATION_TESTS="${SKIP_INTEGRATION_TESTS}"
SKIP_UAT_TESTS="${SKIP_UAT_TESTS}"

CURL_CMD="curl"
if [[ "$2" == "--compose-link" ]]; then
  API_TARGET="https://api:4000"
  WWW_TARGET="https://www:4443"
  [[ -t 1 ]] && TTY_FLAG="t"
  CURL_CMD="docker run --rm --network ${PROJECT}_default --link ${PROJECT}_www:www --link ${PROJECT}_api_1:api -i${TTY_FLAG} byrnedo/alpine-curl -k"
fi
CURL_CMD="${CURL_CMD} -k -I -s --retry 10 --retry-delay 3 --retry-connrefused"

echo "End-to-End test suite starting! targets: www: ${WWW_TARGET}, api: ${API_TARGET}"

echo -n "Waiting for API at ${API_TARGET} to be ready... "
${CURL_CMD} ${API_TARGET}/health | fgrep "HTTP/2 200" || {
  echo "API appears to be offline!"
  exit 1
}

echo -n "Waiting for WWW at ${WWW_TARGET} to be ready... "
${CURL_CMD} ${WWW_TARGET} | egrep "HTTP/(1.1|2) 200" || {
  echo "WWW appears to be offline!"
  exit 1
}

echo "Integration tests..."
./bin/integration_test.sh ${TARGET} index.js "$2"
echo "Integration OK!"

echo "UAT tests..."
./bin/uat_test.sh ${TARGET} "$2"
echo "UAT OK!"
