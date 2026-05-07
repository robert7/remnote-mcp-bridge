#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$repo_root"

source "$repo_root/node-check.sh" || exit 1

package_name="$(node -p "require('./package.json').name")"
bin_name="$(node -p "Object.keys(require('./package.json').bin)[0]")"
npm_global_root="$(npm root -g)"
global_package_path="${npm_global_root}/${package_name}"

if [[ -L "$global_package_path" ]]; then
  npm unlink -g "$package_name"
  echo "Removed global npm link for ${package_name}."
else
  echo "No global npm link present for ${package_name}."
fi

if command -v "$bin_name" >/dev/null 2>&1; then
  echo "${bin_name} is still on PATH:"
  command -v "$bin_name"
fi
