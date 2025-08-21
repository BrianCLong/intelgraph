export interface Node {
  id: string;
  label?: string;
  time?: number; // epoch milliseconds
  region?: string;
  [key: string]: unknown;
}

export interface Graph {
  nodes: Node[];
  edges: Array<{ source: string; target: string }>;
}

export function pivot(graph: Graph, nodeId: string): Node[] {
  return graph.edges
    .filter((e) => e.source === nodeId || e.target === nodeId)
    .map((e) => (e.source === nodeId ? e.target : e.source))
    .map((id) => graph.nodes.find((n) => n.id === id))
    .filter((n): n is Node => Boolean(n));
}

export function expand(graph: Graph, nodeIds: string[]): Node[] {
  const seen = new Set(nodeIds);
  const results: Node[] = [];
  nodeIds.forEach((id) => {
    pivot(graph, id).forEach((n) => {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        results.push(n);
      }
    });
  });
  return results;
}

export function filterByTime(nodes: Node[], start: number, end: number): Node[] {
  return nodes.filter((n) => typeof n.time === 'number' && n.time >= start && n.time <= end);
}

export function filterBySpace(nodes: Node[], region: string): Node[] {
  return nodes.filter((n) => n.region === region);
}

export interface Pinboard {
  name: string;
  nodes: Node[];
  annotations: string[];
}

export function createPinboard(name: string, nodes: Node[] = []): Pinboard {
  return { name, nodes, annotations: [] };
}

export function addAnnotation(pinboard: Pinboard, note: string): void {
  pinboard.annotations.push(note);
}
