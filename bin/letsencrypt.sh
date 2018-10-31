#!/usr/bin/env bash
source ./bin/_variables.sh

S3_CACHE_BUCKET="${S3_CACHE_BUCKET:-thanks-ops}"

rm -rf tmp/certbot/log
mkdir -p tmp/certbot/etc tmp/certbot/log

if [ -f ~/.aws/credentials ]; then
  LOADED_AWS_ACCESS_KEY_ID=$(fgrep -A2 givethanks ~/.aws/credentials | fgrep aws_access_key_id | awk -F'=' '{print $2}' | tr -d ' ' | tr -d '\r')
  LOADED_AWS_SECRET_ACCESS_KEY=$(fgrep -A2 givethanks ~/.aws/credentials | fgrep aws_secret_access_key | awk -F'=' '{print $2}' | tr -d ' ' | tr -d '\r')
fi

docker rm certbotcache certbot > /dev/null 2>&1
docker create -v /etc/letsencrypt -v /var/lib/letsencrypt --name certbotcache certbot/dns-route53 /bin/true

if [ ! -d tmp/certbot ]; then
  echo "Loading from s3 cache"
  aws s3 cp s3://${S3_CACHE_BUCKET}/certbotcache/cache.tar.gz tmp/cache.tar.gz
  if [ -f tmp/cache.tar.gz ]; then
    tar -xzf tmp/cache.tar.gz -C .
    rm -f tmp/cache.tar.gz
  else
    if [ -z "${CI}" ]; then
      mkdir -p tmp/certbot/etc
    else
      echo "Couldnt load cache! Please do this outside of CI first!"
      exit 0
    fi
  fi
fi

for d in $(ls -1 tmp/certbot/etc/); do
  docker cp tmp/certbot/etc/${d} certbotcache:/etc/letsencrypt/${d}
done

if [ ! -z "${TESTMODE}" ]; then
  echo "In TEST MODE"
  TESTMODE="--test-cert"
fi

docker run -it --name certbot \
  -e "AWS_ACCESS_KEY_ID=${LOADED_AWS_ACCESS_KEY_ID}" \
  -e "AWS_SECRET_ACCESS_KEY=${LOADED_AWS_SECRET_ACCESS_KEY}" \
  --volumes-from certbotcache \
  certbot/dns-route53 certonly \
    --dns-route53 \
    -n --agree-tos ${TESTMODE} \
    --expand --no-eff-email \
    --hsts --uir \
    --email admin@${PROJECT_DOMAIN} \
    --server https://acme-v02.api.letsencrypt.org/directory \
    -d "test.${PROJECT_DOMAIN}" \
    -d "www.${PROJECT_DOMAIN}" \
    -d "api.${PROJECT_DOMAIN}" \
    -d "*.ops.${PROJECT_DOMAIN}" \
    -d "${PROJECT_DOMAIN}"

rm -rf tmp/certbot
mkdir -p tmp/certbot
docker cp certbot:/etc/letsencrypt/ tmp/certbot/etc
docker cp certbot:/var/log/letsencrypt/ tmp/certbot/log
docker rm certbot certbotcache > /dev/null 2>&1

fgrep 'Your key file has been saved at:' tmp/certbot/log/letsencrypt.log > /dev/null 2>&1
if [ $? == 0 ]; then
  LETSENCRYPT_NAME=$(ls -1 tmp/certbot/etc/archive/ | head -n1)
  echo "Updating TLS certificate ${LETSENCRYPT_NAME}"
  if [ -z "${TESTMODE}" ]; then
    discordPost ":bell: Deploying an updated ${PROJECT_DOMAIN} TLS certificate"
    
    kubectl create secret tls ${PROJECT_DOMAIN} \
      --cert tmp/certbot/etc/archive/${LETSENCRYPT_NAME}/fullchain1.pem \
      --key tmp/certbot/etc/archive/${LETSENCRYPT_NAME}/privkey1.pem \
      --dry-run -o yaml | kubectl apply -f -
    
    tar -czf tmp/cache.tar.gz tmp/certbot
    aws s3 cp tmp/cache.tar.gz s3://${S3_CACHE_BUCKET}/certbotcache/cache.tar.gz
  else
    echo "Success for cert: ${LETSENCRYPT_NAME}"
  fi
fi
