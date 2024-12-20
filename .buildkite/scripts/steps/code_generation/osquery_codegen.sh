#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

echo --- Osquery OpenAPI Code Generation

(cd x-pack/platform/plugins/shared/osquery && yarn openapi:generate)
check_for_changed_files "yarn openapi:generate" true
