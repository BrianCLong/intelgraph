export interface Scene {
  id: string;
  title: string;
  nodeCount: number;
  edgeCount: number;
}

export interface Node {
  id: string;
  label: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}
