# InnoLens

This is the monorepo for all modules in InnoLens.

## 1. Prerequisite

1. Git

Node.JS modules:

1. Node.JS >=13.7.0
2. Yarn >=1.12.1, **<2**

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

For Node.JS modules:

```shell
# Make sure yarn has the right version
yarn --version

yarn install
```

For Python modules:

```shell
# Make sure the python version is current
python --version

# Create a virtual environment
python -m venv .venv

# For Unix shell
./.venv/Scripts/activate
# For Powershell
./.venv/Scripts/activate.ps1
# For Command Prompt
./.venv/Scripts/activate.bat

# Make sure pip is the latest version
python -m pip install --upgrade pip

# Install dependencies
python -m pip install --requirement requirements.lock

# If you want TensorFlow to support CUDA, follow this guide:
# https://www.tensorflow.org/install/gpu

# If you want to deactivate:
# For Unix shell or Powershell
deactivate
# For Command Prompt
./.venv/Scripts/deactivate.bat
```
