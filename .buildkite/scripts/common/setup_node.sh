#!/usr/bin/env bash

echo "--- Setup Node"

NODE_VERSION="$(cat "$KIBANA_DIR/.node-version")"
export NODE_VERSION
export NODE_DIR="$CACHE_DIR/node/$NODE_VERSION"
export NODE_BIN_DIR="$NODE_DIR/bin"
export YARN_OFFLINE_CACHE="$CACHE_DIR/yarn-offline-cache"

# if [[ ! -d "$NODE_DIR" ]]; then
#   hostArch="$(command uname -m)"
#   case "${hostArch}" in
#     x86_64 | amd64) nodeArch="x64" ;;
#     aarch64) nodeArch="arm64" ;;
#     *) nodeArch="${hostArch}" ;;
#   esac

#   nodeUrl="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$nodeArch.tar.gz"

#   echo "node.js v$NODE_VERSION not found at $NODE_DIR, downloading from $nodeUrl"

#   mkdir -p "$NODE_DIR"
#   curl --silent -L "$nodeUrl" | tar -xz -C "$NODE_DIR" --strip-components=1
# else
#   echo "node.js v$NODE_VERSION already installed to $NODE_DIR, re-using"
#   ls -alh "$NODE_BIN_DIR"
# fi

nodeVersion=$NODE_VERSION
nodeDir=$NODE_DIR
nodeBin=$NODE_BIN_DIR
hostArch="$(command uname -m)"
case "${hostArch}" in
  x86_64 | amd64) nodeArch="x64" ;;
  aarch64) nodeArch="arm64" ;;
  *) nodeArch="${hostArch}" ;;
esac
classifier="$nodeArch.tar.gz"

UNAME=$(uname)
OS="linux"
if [[ "$UNAME" = *"MINGW64_NT"* ]]; then
  OS="win"
  nodeBin="$HOME/node"
  classifier="x64.zip"
elif [[ "$UNAME" == "Darwin" ]]; then
  OS="darwin"
fi
echo " -- Running on OS: $OS"

nodeUrl="https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/dist/v$nodeVersion/node-v$nodeVersion-${OS}-${classifier}"

echo " -- node: version=v${nodeVersion} dir=$nodeDir"

echo " -- setting up node.js"
if [ -x "$nodeBin/node" ] && [ "$("$nodeBin/node" --version)" == "v$nodeVersion" ]; then
  echo " -- reusing node.js install"
else
  if [ -d "$nodeDir" ]; then
    echo " -- clearing previous node.js install"
    rm -rf "$nodeDir"
  fi

  echo " -- downloading node.js from $nodeUrl"
  mkdir -p "$nodeDir"
  if [[ "$OS" == "win" ]]; then
    nodePkg="$nodeDir/${nodeUrl##*/}"
    curl --silent -L -o "$nodePkg" "$nodeUrl"
    unzip -qo "$nodePkg" -d "$nodeDir"
    mv "${nodePkg%.*}" "$nodeBin"
  else
    curl --silent -L "$nodeUrl" | tar -xz -C "$nodeDir" --strip-components=1
  fi
fi

export PATH="$NODE_BIN_DIR:$PATH"


echo "--- Setup Yarn"

YARN_VERSION=$(node -e "console.log(String(require('./package.json').engines.yarn || '').replace(/^[^\d]+/,''))")
export YARN_VERSION

if [[ ! $(which yarn) || $(yarn --version) != "$YARN_VERSION" ]]; then
  npm install -g "yarn@^${YARN_VERSION}"
fi

yarn config set yarn-offline-mirror "$YARN_OFFLINE_CACHE"

YARN_GLOBAL_BIN=$(yarn global bin)
export YARN_GLOBAL_BIN
export PATH="$PATH:$YARN_GLOBAL_BIN"
