FROM node:14.5.0-buster-slim

ARG USER=node
ARG GROUP=node

SHELL [ "bash", "-c" ]

COPY --from=python:3.7.8-slim-buster /usr/local/bin/ /tmp/python/bin/
COPY --from=python:3.7.8-slim-buster /usr/local/include/ /tmp/python/include/
COPY --from=python:3.7.8-slim-buster /usr/local/lib/ /tmp/python/lib/
COPY --from=python:3.7.8-slim-buster /usr/local/share/man/man1/ /tmp/python/share/man/man1/

RUN set -o pipefail \
    #
    # Install system dependencies
    && apt update \
    && apt install --yes --no-install-recommends \
        ca-certificates \
        curl \
        g++ \
        git \
        gnupg \
        jq \
        make \
        procps \
        rsync \
        socat \
        sudo \
    && rm -rf /var/lib/apt/lists/* \
    #
    # Install Python
    && rsync -a /tmp/python/bin/ /usr/local/bin/ \
    && rsync -a /tmp/python/include/ /usr/local/include/ \
    && rsync -a /tmp/python/lib/ /usr/local/lib/ \
    && rsync -a /tmp/python/share/ /usr/local/share/ \
    && ldconfig \
    && rm -rf /tmp/python \
    #
    # Install docker client
    && curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add - \
    && echo "deb [arch=amd64] https://download.docker.com/linux/debian buster stable" \
        > /etc/apt/sources.list.d/docker.list \
    && apt update \
    && apt install --yes --no-install-recommends docker-ce-cli \
    && rm -rf /var/lib/apt/lists/* \
    #
    # Install docker compose
    && COMPOSE_URL=$( \
        curl -fsSL https://api.github.com/repos/docker/compose/releases/latest \
        | jq --raw-output '[.assets[] | select(.name == "docker-compose-Linux-x86_64")][0].browser_download_url' \
    ) \
    && curl -fsSL "${COMPOSE_URL}" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose \
    #
    # Add sudo
    && echo "${USER} ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/${USER} \
    && chmod 0440 /etc/sudoers.d/${USER}

WORKDIR /home/${USER}
USER ${USER}:${GROUP}

COPY --chown=${USER}:${GROUP} ./docker-entrypoint.sh ./docker-entrypoint.sh
ENV PATH=/home/${USER}/.local/bin:/home/${USER}/.yarn/bin:${PATH}
ENTRYPOINT [ "./docker-entrypoint.sh" ]
