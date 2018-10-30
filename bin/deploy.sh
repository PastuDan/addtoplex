#!/usr/bin/env bash
set -e
# High level wrapper for deployments!
# Examples:
# ./bin/deploy.sh prod
# ./bin/deploy.sh local

TARGET=${1:-"local"}
TAG=${2}
SERVICE_TARGETS=${SERVICE_TARGETS:-"api worker"}
START_TIME=$(date +%s)
DEPLOY_SECRETS="api worker rabbitmq"
DEPLOY_SERVICES="api worker worker-donations worker-stripeconnect search-indexer worker-projectnpm"
source ./bin/_variables.sh

AWS_PROFILE_STR=""
if [ -z "${CI}" ]; then
  AWS_PROFILE_STR="--profile=${AWS_PROFILE}"
fi

if [ ! -d "inf/env/${TARGET}" ]; then
  echo "Invalid target - inf/env/${TARGET} does not exist"
  exit 1
fi

# Generate TAG from git commit
if [ -z "${TAG}" ]; then
  COMMIT_HASH=$(git log -1 | head -n1 | awk '{print $2}')
  TAG=$(echo $COMMIT_HASH | cut -c1-7)
fi

# If we need to push the image, we'll need to get AWS ECR credentials for docker
if [[ "$TARGET" == "prod" || "$TARGET" == "ci" ]]; then
  echo "Getting AWS ECR credentials..."
  eval $(aws ecr get-login --no-include-email ${AWS_PROFILE_STR})
fi

# Publish images build by CI
if [[ "$TARGET" == "ci" ]]; then
  docker push ${DOCKER_CONTAINER_NAME}:${TAG}
fi

# Local deployments are just docker-compose
if [[ "$TARGET" == "local" || "$TARGET" == "ci" ]]; then
  SERVICES_TO_START="api worker" source ./bin/_startup_local.sh

  WWW_CONTAINER=$(docker ps -q -f name=addtoplex_www)
  if [ -z "$WWW_CONTAINER" ]; then
    echo "Deploying local nginx"
    docker run --rm -d \
      --name ${PROJECT}_www \
      --network ${PROJECT}_default \
      -v /usr/share/nginx/html \
      -v /etc/nginx \
      -v /etc/ssl \
      -p 4443 \
      nginx
  fi

  docker cp build/. ${PROJECT}_www:/usr/share/nginx/html/
  docker cp inf/nginx.conf ${PROJECT}_www:/etc/nginx/nginx.conf
  docker cp secrets/. ${PROJECT}_www:/etc/ssl/
  docker exec -it addtoplex_www service nginx reload
else
  if [[ "$TARGET" == "prod" ]]; then
    ./bin/vault.sh decryptAll prod
    readEnvFile
  fi

  if [ -z "${SKIP_DELAY}" ]; then
    echo -n "Deploying '${TAG}' to '${TARGET}' in 3"
    sleep 1; echo -n " 2"; sleep 1; echo -n " 1"; sleep 1
    echo " now!"
  fi

  docker pull ${DOCKER_CONTAINER_NAME}:${TAG} || {
      echo "Couldnt pull image"
  }

  if [ "$TARGET" == "prod" ]; then
    echo "Tagging ${TAG} as latest"
    docker tag ${DOCKER_CONTAINER_NAME}:${TAG} ${DOCKER_CONTAINER_NAME}:latest
    docker push ${DOCKER_CONTAINER_NAME}:${TAG}
    docker push ${DOCKER_CONTAINER_NAME}:latest
  fi

  # Deploy secrets
  mkdir -p secrets
  for SECRET_TARGET in ${DEPLOY_SECRETS}; do
    if [ -f "inf/env/${TARGET}/${SECRET_TARGET}.env.plain" ]; then
      ./bin/envs_to_secrets.sh ${SECRET_TARGET} inf/env/${TARGET}/${SECRET_TARGET}.env.plain > secrets/${SECRET_TARGET}.yaml
      kubectl apply -f secrets/${SECRET_TARGET}.yaml
    else
      echo "Missing \"inf/env/${TARGET}/${SECRET_TARGET}.env.plain\" :("
    fi
  done

  # Deploying applications!
  for DEPLOYMENT in ${DEPLOY_SERVICES}; do
    DEPLOY_FILE="inf/kube/deployments/${DEPLOYMENT}.yaml"
    if [ -f ${DEPLOY_FILE} ]; then
      kubectl set image deployment/${DEPLOYMENT} ${DEPLOYMENT}=${DOCKER_CONTAINER_NAME}:${TAG}
    else
      echo "Warning, missing ${DEPLOY_FILE}"
    fi
  done

  # Assets are immutable and can be cached forever, without revalidation
  aws ${AWS_PROFILE_STR} s3 sync \
    --cache-control public,max-age=31536000,immutable \
    build/static/ s3://${PROJECT_DOMAIN}/static/ \
    --delete \
    --acl public-read

  # Anything in the top level should be cached only breifly (index.html)
  aws ${AWS_PROFILE_STR} s3 sync \
    --cache-control public,max-age=300 \
    build/ s3://${PROJECT_DOMAIN}/ \
    --acl public-read

  # TODO purge cloudflare cache
fi

if [ ! -z "${CI}" ]; then
    AUTHOR=$(git log -1 | fgrep Author | sed 's/Author:\ //' | awk '{print $1}')
    COMMIT_HASH=$(git log -1 | head -n1 | awk '{print $2}')
    COMMIT_SHORT=$(echo $COMMIT_HASH | cut -c1-7)
    DEPLOY_MESSAGE=":green_heart: Deploy [${COMMIT_SHORT}](https://github.com/pastudan/addtoplex.app/commit/${COMMIT_HASH}) by ${AUTHOR} complete! [circleci](${CIRCLE_BUILD_URL})"
    if [[ "$TARGET" == "prod" ]]; then
      discordPost "${DEPLOY_MESSAGE}"
    fi
fi

echo "-> Done in $(($(date +%s) - $START_TIME)) seconds"
