#!/usr/bin/env bash
set -euo pipefail
linkerd install | kubectl apply -f -
linkerd check
