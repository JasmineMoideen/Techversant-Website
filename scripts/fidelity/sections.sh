#!/usr/bin/env bash
# Usage: scripts/fidelity/sections.sh <viewport> <from:to> [from:to ...]   (recaptures local, diffs each region)
cd "$(dirname "$0")/../.." && source env.sh
v=$1; shift
timeout 100 pnpm -s fidelity:capture --base http://localhost:3000 --out fidelity/current --routes / --viewports "$v" 2>&1 | grep -E "h=|rror" | sed 's/  */ /g'
for r in "$@"; do f=${r%:*}; t=${r#*:}; echo -n "$f-$t  "; timeout 60 pnpm -s fidelity:diff --routes / --viewports "$v" --from "$f" --to "$t" 2>&1 | grep -E "PASS|FAIL" | sed 's/  */ /g'; done
