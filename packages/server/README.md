# InnoLens Server

## 1. Prerequisites

Follow the instructions in `../../README.md`.

## 2. Install

```shell
cd ./packages/server

# Compile the source code
yarn run build

# Create a server configuration file
cp server.config.sample.js server.config.js

# Edit the configuration file if needed
```

## 3. Run

```shell
# Make sure the MongoDB database is online now

# Start the server
yarn run start

# Go to http://localhost:3000/api to see if it is working
```

## 4. Developer notes

## 4.1. Commands

```shell
yarn run [Command]
```

| Command     | Usage |
| ----------- | ----- |
| lint:es     | Use ESLint to lint the source code |
| build       | Compile the code into the `out` folder |
| build:watch | Same as build, but auto recompile when the source code is changed |
| start       | Start the server |
| deploy      | Start the server in PM2 |

### 4.2. Consistent code style

Use the `lint:es` command to see if there is any inconsistent code style.

Instead of entering the command again and again, install the [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension in VS Code. The necessary configuration settings for the extension is provided.

### 4.3. Auto recompilation

Instead of using the `build` command every time a change is made to the source code, use the `build:watch` command.

### 4.4. Debugging

The necessary configuration file for debugging in VS Code is provided.

1.  Open VS Code
2.  Click "File" > "Open Folder..."
3.  Select the folder `innolens/packages/server`
4.  Click the debug icon in the activity bar on the left
5.  Select "Launch Server" in the dropdown menu
6.  Click the run button to start debugging the server

> The server auto restarts itself whenever a change is made to the compiled code.

For more information, see [Debugging in Visual Studio Code](https://code.visualstudio.com/docs/editor/debugging) and [Debug Node.js Apps using Visual Studio Code](https://code.visualstudio.com/docs/nodejs/nodejs-debugging).

### 4.5. Deployment Monitoring

To see the process status, logs, etc., use PM2. Learn more on the [PM2 documentation](http://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/).

### 4.6. No broken code in git

Never commit broken code to git. This makes life harder. If it is necessary, comment it.

### 4.6. Be careful which branch you are committing to

Unless you have experience in using git, messing git up makes everybody angry.
