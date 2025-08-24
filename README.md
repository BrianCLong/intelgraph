# GA-FinIntel

Vertical slice implementation of GA-FinIntel providing ingestion, screening, typology detection, risk scoring, path analytics, and a minimal UI.

## Quickstart
```bash
npm install
pip install -e packages/finintel -e packages/ingestors
npm run build --workspaces
npm test
```

## Architecture
```
[CSV/XML] -> [Ingestor] -> [Gateway GraphQL] -> [Finintel Service]
    |                                 |-> [Screening]
    |                                 |-> [Typologies]
    |                                 |-> [Risk/Paths]
```
