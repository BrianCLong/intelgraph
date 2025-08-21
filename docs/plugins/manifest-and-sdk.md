# Plugin Manifest and TypeScript SDK

This document describes the experimental plugin manifest format and the TypeScript utilities that third-party extensions can use to interact with the IntelGraph platform.

## Manifest (`plugin.json`)

Plugins declare metadata and capabilities in a `plugin.json` file. The schema is defined in [`plugins/plugin.schema.json`](../../plugins/plugin.schema.json) and supports the following fields:

- `id`, `name`, `version`
- `permissions`: list of requested permission scopes
- `entrypoints`: paths to job and UI entry modules
- `panels`: optional UI panels exposed to the host application
- `settings`: plugin-specific configuration schema

## TypeScript SDK

The SDK exposes helpers for calling the GraphQL API, registering UI panels, and emitting telemetry events.

```ts
import { createGraphClient, registerPanel, emitTelemetry } from '../../plugins/sdk/ts';

const client = createGraphClient('/graphql');

registerPanel({
  id: 'sample-panel',
  name: 'Sample Panel',
  component: {}, // host will replace with runtime component
});

emitTelemetry('plugin-loaded', { id: 'sample-plugin' });
```

These APIs are placeholders pending the full sandboxed runtime and should not be used in production.
