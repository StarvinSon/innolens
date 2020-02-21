# InnoLens

This is the monorepo for all modules in InnoLens.

## 1. Prerequisite

1. Git

Node.JS modules:

1. Node.JS >=13.7.0
2. Yarn >=1.22.0, **<2**

Database:

1. MongoDB >=4.2

IDE:

1. Visual Studio Code

## 2. Install

```shell
# Open a terminal

# Clone the repository
git clone https://github.com/StarvinSon/innolens.git innolens
cd innolens
```

For Node.JS modules (server, dashboard):

```shell
# Make sure yarn has the right version
yarn --version

# Install the dependencies
yarn install
```

For more information about server, see `./packages/server/README.md`.
