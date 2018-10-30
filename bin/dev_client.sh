#!/usr/bin/env bash
set -e
source ./bin/_variables.sh

TARGET="${TARGET:=local}"

set -a
source "inf/env/${TARGET}/www.env.plain"
set +a

readEnvFile

yarn start
