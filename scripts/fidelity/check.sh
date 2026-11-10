#!/usr/bin/env bash
# Capture the local app and diff against the references.   scripts/fidelity/check.sh "/a/,/b/" "1440,390"
source ~/techversant-next/env.sh >/dev/null 2>&1
cd ~/techversant-next
pnpm -s fidelity:capture --base "${BASE:-http://localhost:3000}" --out fidelity/current --routes "$1" --viewports "$2" --concurrency 3 2>&1 | grep -iE "error|fail" 
pnpm -s fidelity:diff --routes "$1" --viewports "$2" ${3:+--ref "$3"} 2>&1 | grep -E "PASS|FAIL|not yet" | sed 's/ \+/ /g'
