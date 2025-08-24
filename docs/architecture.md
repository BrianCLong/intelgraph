# GA-FinIntel Architecture

This document outlines the architecture for the GA-FinIntel vertical slice. Services are organized as independent packages orchestrated via docker-compose. The pipeline flows:

```
KYC -> Ingest -> Screen -> Detect -> Score -> Alert -> Export
```

Each step records provenance for auditability.
