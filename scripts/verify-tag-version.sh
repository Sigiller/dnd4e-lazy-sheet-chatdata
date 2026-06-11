#!/usr/bin/env bash
# Verify release tags (vX.Y.Z) match module.json before push.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODULE_JSON="${ROOT}/module.json"

if [[ ! -f "$MODULE_JSON" ]]; then
  echo "pre-push: module.json not found at ${MODULE_JSON}" >&2
  exit 1
fi

MVER="$(node -e "console.log(JSON.parse(require('node:fs').readFileSync('${MODULE_JSON}','utf8')).version)")"

verify_tag_ref() {
  local ref="$1"
  local sha="$2"

  # Tag deletion — nothing to verify.
  if [[ "$sha" == "0000000000000000000000000000000000000000" ]]; then
    return 0
  fi

  if [[ ! "$ref" =~ ^refs/tags/v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    return 0
  fi

  local tag="${ref#refs/tags/}"
  local tag_ver="${tag#v}"

  if [[ "$tag_ver" != "$MVER" ]]; then
    echo "pre-push: tag ${tag} implies version ${tag_ver}, but module.json has ${MVER}" >&2
    echo "pre-push: bump module.json version before pushing the release tag" >&2
    exit 1
  fi

  echo "pre-push: ${tag} matches module.json version ${MVER}"
}

if [[ $# -ge 2 ]]; then
  verify_tag_ref "$1" "$2"
  exit 0
fi

if [[ $# -eq 1 ]]; then
  verify_tag_ref "$1" "push"
  exit 0
fi

while read -r local_ref local_sha _remote_ref _remote_sha; do
  verify_tag_ref "$local_ref" "$local_sha"
done

exit 0
