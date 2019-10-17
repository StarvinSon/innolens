# InnoLens Server

## 1. Prerequisites

1.  [Git](https://www.git-scm.com)
1.  [Node.js](https://nodejs.org) (version >= 12.12.0)
2.  [Yarn](https://yarnpkg.com)
3.  [Visual Studio Code](https://code.visualstudio.com) for easier development

## 2. Run the server

1.  Open a terminal
    ```shell
    # Clone the repository
    git clone https://github.com/StarvinSon/innolens-server.git

    cd innolens-server

    # Install the dependencies
    yarn install

    # Compile the source code
    yarn run build

    # Install the process manager
    yarn global add pm2

    # Start the server
    yarn run start
    ```
2.  Go to <http://localhost:3000/api> to see if it is working

## 3. Explainer

This explainer lists some important technologies being used and the repository structure.

### 3.1. Language

1.  [TypeScript](https://www.typescriptlang.org)

### 3.2. Libraries

1.  [koa](https://koajs.com)
2.  [PM2](http://pm2.keymetrics.io)

### 3.3. Structure

- `.vscode` settings for VS Code
  - `launch.json` debug config
  - `settings.json` settings for the IDE
- `node_modules` folder for dependencies
- `out` compiled code
- `src` source code
- `.eslintrc.js` ESLint config
- `.gitignore` paths to exclude from git tracking
- `app.log` server log
- `ecosystem.config.js` PM2 config
- `package.json` list of dependency of the server
- `README.md` this file
- `tsconfig.json` TypeScript config
- `yarn.lock` list of dependency and their installed versions

## 4. Developer notes

## 4.1. Commands

Open a terminal
```shell
cd path/to/innolens-server
yarn run [Command]
```

| Command     | Usage |
| ----------- | ----- |
| lint        | Use ESLint to lint the source code |
| build       | Compile the code into the `out` folder |
| build:watch | Same as build, but auto recompile when the source code is changed |
| start       | Start the server in PM2 |
| start:debug | Start the server in debug mode in PM2 |

### 4.2. Consistent code style

Use the `lint` command to see if there is any inconsistent code style.

Instead of entering the command again and again, install the [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension in VS Code. The necessary configuration settings for the extension is provided.

### 4.3. Auto recompilation

Instead of using the `build` command every time a change is made to the source code, use the `build:watch` command.

### 4.4. Debugging

The necessary configuration file for debugging in VS Code is provided.

1.  Open VS Code
2.  Click "File" > "Open Folder..."
3.  Select the folder `innolens-server`
4.  Click the debug icon in the activity bar on the left
5.  Select "Launch Server" in the dropdown menu
6.  Click the run button to start debugging the server

> The server auto restarts itself whenever a change is made to the compiled code.

For more information, see [Debugging in Visual Studio Code](https://code.visualstudio.com/docs/editor/debugging) and [Debug Node.js Apps using Visual Studio Code](https://code.visualstudio.com/docs/nodejs/nodejs-debugging).

### 4.5. Monitoring

To see the process status, logs, etc., use PM2. Learn more on the [PM2 documentation](http://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/).

### 4.6. No broken code in git

Never commit broken code to git. This makes life harder. If it is necessary, comment it.

### 4.6. Be careful which branch you are committing to

Unless you have experience in using git, messing git up makes everybody angry.
