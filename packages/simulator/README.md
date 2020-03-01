# InnoLens Simulator

## 1. Prerequisites

Follow the instructions in `../../README.md`.

## 2. Install

No need to install.

## 3. Run

```shell
# Activate the virtual environment

python -m innolens_simulator
```

## 4. Developer notes

## 4.1. Commands

```shell
# Activate the virtual environment

python -m [Command]
```

| Command | Usage |
| ------- | ----- |
| innolens_simulator | Run the simulator. The output is written to `./simulation_result` by default |
| mypy --config-file ./mypy.ini --package innolens_simulator | Use mypy to type check the code |

### 4.2. Type Safety

Use the `mypy` command to see if there is any error about type safety in the code.

Instead of entering the command again and again, install the [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) extension in VS Code. The necessary configuration settings for the extension is provided.

### 4.4. Debugging

The necessary configuration file for debugging in VS Code is provided.

1.  Open VS Code
2.  Click "File" > "Open Folder..."
3.  Select the folder `innolens/packages/simulator`
4.  Click the debug icon in the activity bar on the left
5.  Select "Simulator" in the dropdown menu
6.  Click the run button to start debugging the server

For more information, see [Debugging in Visual Studio Code](https://code.visualstudio.com/docs/editor/debugging) and [Python - Debugging](https://code.visualstudio.com/docs/languages/python#_debugging).
