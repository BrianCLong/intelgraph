#!/usr/bin/env bash
set -euo pipefail
k3d cluster create region-a --agents 1 --servers 1 --port 8081:80@loadbalancer
