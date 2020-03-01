# InnoLens

This is the monorepo for all modules in InnoLens.

## 1. Prerequisite

1. Git

Node.JS modules:

1. Node.JS >=13.9.0
2. Yarn >=1.22.0, **<2**

Python modules:

1. Python >=3.7, <3.8 (TensorFlow does not support 3.8 yet)

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

For Python modules:

```shell
# Make sure the python version is current
python --version

# Create a virtual environment
python -m venv ./.venv

# Upgrade packages
python -m pip install --upgrade pip setuptools

# Activate the virtual environment
# - For Unix shell
./.venv/Scripts/activate
# - For Powershell
./.venv/Scripts/activate.ps1
# - For Command Prompt
./.venv/Scripts/activate.bat

# Install dependencies
python -m pip install --requirement requirements.lock

# Deactivate the virtual environment
# - For Unix shell or Powershell
deactivate
# - For Command Prompt
./.venv/Scripts/deactivate.bat
```

For more information about each package, see the `README.md` in each package folder.
