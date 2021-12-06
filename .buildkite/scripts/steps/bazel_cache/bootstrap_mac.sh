#!/bin/bash

set -euo pipefail

export BUILD_TS_REFS_CACHE_ENABLE=true
export BUILD_TS_REFS_CACHE_CAPTURE=false # TODO
export DISABLE_BOOTSTRAP_VALIDATION=true
export BUILD_TS_REFS_DISABLE=false

TMP_HOME="$WORKSPACE/tmp_home"
rm -rf "$TMP_HOME"
export HOME="$TMP_HOME"

.buildkite/scripts/bootstrap.sh
