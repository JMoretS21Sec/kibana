#!/bin/bash

set -euo pipefail

TMP_HOME="$WORKSPACE/tmp_home"
rm -rf "$TMP_HOME"
export HOME="$TMP_HOME"

.buildkite/scripts/bootstrap.sh
