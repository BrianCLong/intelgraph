#!/bin/bash
echo "Merging Active Measures v5 components..."
cp -R active-measures-module-v5/* .
docker-compose build --no-cache active-measures
echo "Merge complete. Run 'docker-compose up' to start."
