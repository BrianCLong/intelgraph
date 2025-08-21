#!/usr/bin/env bash
set -euo pipefail

wait_for() {
  local url=$1; local name=$2
  for i in {1..60}; do
    if curl -fsS "$url" >/dev/null; then echo "$name up"; return 0; fi
    sleep 2
  done
  echo "Timed out waiting for $name" && exit 1
}

wait_for http://localhost:4002/copilot/preview copilot
wait_for http://localhost:4003/sandbox/run sandbox || true # may require POST; presence indicates container

# Minimal API smoke — preview
curl -sS -X POST http://localhost:4002/copilot/preview \
  -H 'content-type: application/json' \
  -d '{"prompt":"Find links between A and B"}' | jq .

# Sandbox write-block check
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:4003/sandbox/run \
  -H 'content-type: application/json' -d '{"cypher":"CREATE (n)"}')
[[ "$code" == "403" ]] && echo "Sandbox write-block ✅" || (echo "Sandbox write-block ❌ ($code)"; exit 1)

echo "Smoke OK"
