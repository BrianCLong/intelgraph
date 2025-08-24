#!/usr/bin/env bash
set -euo pipefail
k3d cluster create region-b --agents 1 --servers 1 --port 8082:80@loadbalancer
