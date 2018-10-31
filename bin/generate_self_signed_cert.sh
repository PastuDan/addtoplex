#!/usr/bin/env bash
set -e
source ./bin/_variables.sh

# This script is typically run by `./bin/dev.sh`, not manually

SECRETSDIR="secrets"

mkdir -p ${SECRETSDIR}

openssl genrsa -des3 -passout pass:xxxx -out ${SECRETSDIR}/selfsigned.pass.key 2048
openssl rsa -passin pass:xxxx -in ${SECRETSDIR}/selfsigned.pass.key -out ${SECRETSDIR}/selfsigned.key.pem
rm ${SECRETSDIR}/selfsigned.pass.key
openssl req -new -key ${SECRETSDIR}/selfsigned.key.pem -out ${SECRETSDIR}/selfsigned.csr.pem \
 -subj "//C=US/ST=California/L=SanFrancisco/O=${PROJECT}/OU=foobar/CN=${PROJECT_DOMAIN}"
openssl x509 -req -sha256 -days 365 -in ${SECRETSDIR}/selfsigned.csr.pem -signkey ${SECRETSDIR}/selfsigned.key.pem -out ${SECRETSDIR}/selfsigned.crt.pem
