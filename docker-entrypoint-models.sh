#!/bin/sh

set -o errexit

if [ "${#}" -eq 0 ] || [ "${1#-}" != "${1}" ]; then
  set -- python -m innolens_models serve "$@"
fi

exec "$@"
