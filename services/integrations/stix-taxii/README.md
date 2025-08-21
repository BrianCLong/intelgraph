# STIX/TAXII Integration

Bi-directional exchange of threat intelligence using STIX/TAXII standards.

- **Accepts**: Push/pull round-trip
- **Purpose**: Enables both incoming and outgoing STIX/TAXII data flows for full synchronization.

## Usage

```js
const { pushBundle, pullCollection } = require('./index');

// push a STIX bundle
await pushBundle('https://taxii.example.com', process.env.TAXII_TOKEN, bundle);

// pull objects from a collection
const objects = await pullCollection(
  'https://taxii.example.com',
  process.env.TAXII_TOKEN,
  'collection-id'
);
```

Both helpers use `axios` and expect a TAXII 2.1 compatible server.
