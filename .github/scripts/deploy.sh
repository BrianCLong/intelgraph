#!/bin/bash
set -euo pipefail

# Required environment variables:
# GITHUB_TOKEN
# REGISTRY (e.g., ghcr.io)
# IMAGE_NAME_SERVER
# IMAGE_NAME_CLIENT
# DOCKER_COMPOSE_PATH
# DB_PASSWORD
# DB_HOST
# DB_USER
# DB_NAME
# MIGRATION_SCRIPT_PATH

echo "Logging into registry..."
echo "$GITHUB_TOKEN" | docker login "$REGISTRY" -u "$GITHUB_ACTOR" --password-stdin

echo "Pulling services..."
docker compose -f "$DOCKER_COMPOSE_PATH" pull "$IMAGE_NAME_SERVER" "$IMAGE_NAME_CLIENT"

echo "Recreating services..."
docker compose -f "$DOCKER_COMPOSE_PATH" up -d "$IMAGE_NAME_SERVER" "$IMAGE_NAME_CLIENT"

echo "Pruning unused images..."
docker image prune -f

# Pre-migration backup (PostgreSQL)
PG_BACKUP_FILE="/tmp/pg_backup_$(date +%Y%m%d%H%M%S).sql"
if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" > "$PG_BACKUP_FILE"; then
  echo "PostgreSQL backup created at $PG_BACKUP_FILE"
else
  echo "Failed to create PostgreSQL backup. Continuing deployment..."
fi

# Pre-migration backup (Neo4j - Placeholder)
echo "Neo4j backup placeholder: Perform neo4j-admin dump or APOC backup here"

# Run database migrations
echo "Running database migrations..."
if node "$MIGRATION_SCRIPT_PATH"; then
  echo "Database migrations completed successfully."
else
  echo "Database migrations failed. Please check the logs."
  # Consider whether to roll back or take other action here
fi