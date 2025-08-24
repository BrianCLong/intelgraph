#!/usr/bin/env bash
set -euo pipefail
TENANT="${1:-default}"
REDIS="${REDIS_URL:-redis://redis:6379}"
HASH_FILE="${2:-./persisted-hashes.txt}"

if [[ ! -f "$HASH_FILE" ]]; then
  echo "Hash list not found: $HASH_FILE" >&2; exit 1
fi

echo "Seeding persisted query hashes for tenant=$TENANT"
while read -r h; do
  [[ -z "$h" ]] && continue
  redis-cli -u "$REDIS" SADD "pq:${TENANT}:${h}" "$h" >/dev/null
  echo "+ $h"
done < "$HASH_FILE"

echo "Done."
