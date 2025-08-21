#!/usr/bin/env bash
set -euo pipefail
mkdir -p docs/ADR scripts
create(){ mkdir -p "$(dirname "$1")"; cat > "$1" <<'EOF'
$2
EOF
}
# Usage: create path "content"
# Paste each file from the sections above into create calls or save manually.