import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = join(__dirname, 'compose.yaml');

// Compose subgraphs using Apollo Rover. Requires rover installed.
execSync(
  `rover supergraph compose --config ${config} -o ${join(__dirname, 'supergraph.graphql')}`,
  {
    stdio: 'inherit',
  },
);
