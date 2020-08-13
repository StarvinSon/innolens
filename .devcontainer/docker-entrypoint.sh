#!/bin/sh

set -o errexit

# Forward docker socket
sudo rm -f /var/run/docker.sock
sudo socat "UNIX-LISTEN:/var/run/docker.sock,fork,user=$(id --user --name)",mode=660 UNIX-CONNECT:/var/run/docker-host.sock &

# Fix volume permission
sudo chown "$(id --user --name):$(id --group --name)" /workspace/node_modules

exec "$@"
