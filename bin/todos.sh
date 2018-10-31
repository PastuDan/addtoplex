#!/bin/bash

fgrep -i -n -R 'TODO' ./src \
| sed 's/$/\n==================\n/' \
| tr ':' '\n' | sed -e 's/^[ \t]*//' \
| sed -e 's/\([0-9]\+\)/Line \1/'
