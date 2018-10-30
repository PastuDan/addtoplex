#!/usr/bin/env bash
set -e

pushd inf/terraform

AWS_PROFILE=givethanks \
    terraform $@

popd
