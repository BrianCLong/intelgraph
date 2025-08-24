# secrets-js

Typed helpers for retrieving short-lived secrets from the brokered API.

```ts
import { getSecret } from './src/index.js';

await getSecret({ path: 'db/creds' });
```
