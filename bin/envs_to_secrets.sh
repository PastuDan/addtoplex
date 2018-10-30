#!/usr/bin/env bash
source ./bin/_variables.sh

# converts normal env files into Kubernetes secrets

echo "apiVersion: v1
kind: Secret
metadata:
  name: $1
type: Opaque
data:"

IFS=$'\n'
for e in `cat $2 | \
  egrep -v "^$" | \
  egrep -v "^#"`; do
    KEY=$(echo $e | awk -F"=" '{print $1}')
    VALUE="$(echo $e | awk -F"=" '{print $2}' | tr -d '\n' | base64 | tr -d '\n')"
    echo "  $KEY: $VALUE"
done
