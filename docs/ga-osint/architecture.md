# GA-OSINT Architecture

```
[fixtures] -> [ingestors] -> [osint service] -> [gateway] -> [web ui]
           \-> [capture service] -/
```

This document provides a high-level overview of the GA-OSINT vertical slice. Fixtures are ingested and normalized by the ingestors. The OSINT service performs text extraction and analysis while the capture service archives content. The gateway exposes a GraphQL API consumed by the web UI.
