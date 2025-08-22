TAG ?= $(shell git describe --tags --abbrev=0 2>/dev/null || echo v0.0.0)
REL ?= $(shell date +release/%Y-%m-%d)

.PHONY: verify release tag deploy rollback smoke
verify: ## Run hardening + gates locally
	@bash scripts/verify-repo-hardening.sh

<<<<<<< HEAD
release: ## Create release branch and push
	@git checkout -b $(REL) && git push -u origin $(REL)

tag: ## Tag using current date version (override with TAG=vYYYY.MM.DD)
	@git tag $(TAG) && git push origin $(TAG)

deploy: ## Watch CD logs (placeholder: prints hint)
	@echo "Open Actions → CD job for $(TAG) and monitor helm upgrade."

rollback: ## Helm rollback to previous revision
	helm history intelgraph && echo "Run: helm rollback intelgraph <REVISION>"

smoke: ## Post-deploy smoke tests stub
	@curl -fsS https://your.domain/readyz >/dev/null
	@curl -fsS -X POST https://your.domain/graphql   -H 'content-type: application/json'   -d '{"query":"{ __typename }"}' >/dev/null
	@echo "Smoke OK"
=======
bootstrap: ; @test -f .env || cp .env.example .env; 
	npm ci; 
	npm ci --prefix server; 
	npm ci --prefix client; 
	echo "✅ .env and dependencies ready. Next: make up"
up: ; docker compose up -d --build
up-ai: ; docker compose --profile ai up -d --build
up-kafka: ; docker compose --profile kafka up -d --build
up-full: ; docker compose --profile ai --profile kafka up -d --build
down: ; docker compose down --remove-orphans
logs: ; docker compose logs -f
ps: ; docker compose ps
server: ; cd server && npm install && npm run dev
client: ; cd client && npm install && npm run dev
ingest: ; if [ ! -d ingestion/.venv ]; then $(PY) -m venv ingestion/.venv; fi; \
  source ingestion/.venv/bin/activate && pip install -r ingestion/requirements.txt && $(PY) ingestion/main.py
graph: ; if [ ! -d graph-service/.venv ]; then $(PY) -m venv graph-service/.venv; fi; \
  source graph-service/.venv/bin/activate && pip install -r graph-service/requirements.txt && $(PY) graph-service/main.py
smoke: ; node smoke-test.js
clean: ; find . -name "node_modules" -type d -prune -exec rm -rf '{}' +; \
  find . -name ".venv" -type d -prune -exec rm -rf '{}' +; echo "🧹 cleaned node_modules and venvs"
reset-db: ; docker compose down; \
  V=$$(docker volume ls -q | grep neo4j_data || true); \
  if [ -n "$$V" ]; then docker volume rm $$V; fi; \
  echo "🗑️  Neo4j volume removed"

# MVP-1++ Sprint Targets
preflight:
	@ts-node scripts/migrate/preflight_cli.ts

migrate-1_0_0:
	@ts-node server/src/migrations/1.0.0_migration.ts

cost-report:
	@bash scripts/ops/cost_report.sh

ingest-assets:
	@if [ -z "$(path)" ]; then echo "path=<csv> required"; exit 1; fi; \
	if [ -z "$(org)" ]; then echo "org=<ORG> required"; exit 1; fi; \
	$(PY) data-pipelines/universal-ingest/assets_csv.py $(path) --org $(org)

# GA Release Target
ga:
	make preflight && npm test && npx @cyclonedx/cyclonedx-npm --output-file sbom.json && ./scripts/release/verify_install.sh
>>>>>>> origin/main
