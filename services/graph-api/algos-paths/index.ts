export interface PathEdge {
  from: string
  to: string
  weight?: number
  policy?: string
  territory?: string
  time?: number
}

export interface ConstraintOptions {
  policies?: string[]
  territories?: string[]
  timeWindow?: [number, number]
}

interface QueueNode {
  node: string
  cost: number
  path: string[]
}

function filterEdges(edges: PathEdge[], constraints?: ConstraintOptions): PathEdge[] {
  if (!constraints) return edges
  return edges.filter((e) => {
    if (constraints.policies && e.policy && !constraints.policies.includes(e.policy)) {
      return false
    }
    if (constraints.territories && e.territory && !constraints.territories.includes(e.territory)) {
      return false
    }
    if (constraints.timeWindow && typeof e.time === 'number') {
      const [start, end] = constraints.timeWindow
      if (e.time < start || e.time > end) return false
    }
    return true
  })
}

function buildGraph(edges: PathEdge[]): Map<string, PathEdge[]> {
  const graph = new Map<string, PathEdge[]>()
  for (const edge of edges) {
    if (!graph.has(edge.from)) graph.set(edge.from, [])
    graph.get(edge.from)!.push(edge)
  }
  return graph
}

export function shortestPath(
  edges: PathEdge[],
  start: string,
  goal: string,
  constraints?: ConstraintOptions
): string[] | null {
  const filtered = filterEdges(edges, constraints)
  const graph = buildGraph(filtered)
  const visited = new Set<string>()
  const queue: QueueNode[] = [{ node: start, cost: 0, path: [start] }]

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost)
    const current = queue.shift()!
    if (current.node === goal) return current.path
    if (visited.has(current.node)) continue
    visited.add(current.node)
    const neighbors = graph.get(current.node) || []
    for (const edge of neighbors) {
      if (!visited.has(edge.to)) {
        queue.push({
          node: edge.to,
          cost: current.cost + (edge.weight ?? 1),
          path: [...current.path, edge.to]
        })
      }
    }
  }

  return null
}

export function kShortestPaths(
  edges: PathEdge[],
  start: string,
  goal: string,
  k: number,
  constraints?: ConstraintOptions
): string[][] {
  const paths: string[][] = []
  const filtered = filterEdges(edges, constraints)

  // Simple Yen's algorithm style approach
  const basePath = shortestPath(filtered, start, goal)
  if (!basePath) return paths
  paths.push(basePath)
  const potential: { cost: number; path: string[] }[] = []

  for (let i = 1; i < k; i++) {
    const lastPath = paths[i - 1]
    for (let j = 0; j < lastPath.length - 1; j++) {
      const spurNode = lastPath[j]
      const rootPath = lastPath.slice(0, j + 1)
      const removed: PathEdge[] = []

      for (const p of paths) {
        if (p.length > j && rootPath.every((v, idx) => v === p[idx])) {
          const edgeToRemove = filtered.find(
            (e) => e.from === p[j] && e.to === p[j + 1]
          )
          if (edgeToRemove) {
            filtered.splice(filtered.indexOf(edgeToRemove), 1)
            removed.push(edgeToRemove)
          }
        }
      }

      const spurPath = shortestPath(filtered, spurNode, goal)
      if (spurPath) {
        const totalPath = [...rootPath.slice(0, -1), ...spurPath]
        const cost = totalPath.reduce((sum, _, idx, arr) => {
          if (idx === arr.length - 1) return sum
          const edge = edges.find((e) => e.from === arr[idx] && e.to === arr[idx + 1])
          return sum + (edge?.weight ?? 1)
        }, 0)
        potential.push({ cost, path: totalPath })
      }

      filtered.push(...removed)
    }

    if (!potential.length) break
    potential.sort((a, b) => a.cost - b.cost)
    const best = potential.shift()!
    paths.push(best.path)
  }

  return paths
}

export function constrainedPaths(
  edges: PathEdge[],
  start: string,
  goal: string,
  constraints: ConstraintOptions
): string[] | null {
  return shortestPath(edges, start, goal, constraints)
}
