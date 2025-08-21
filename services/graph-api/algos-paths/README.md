# Pathfinding Suite

Provides shortest path, k-shortest paths, and constrained searches with policy, territory, and time window filters.

## Usage
```ts
import { shortestPath, kShortestPaths, constrainedPaths, PathEdge } from './index'

const edges: PathEdge[] = [
  { from: 'A', to: 'B', weight: 1, policy: 'allow', territory: 'US', time: 1 },
  { from: 'B', to: 'C', weight: 1, policy: 'allow', territory: 'US', time: 2 }
]

shortestPath(edges, 'A', 'C') // ['A', 'B', 'C']
```
