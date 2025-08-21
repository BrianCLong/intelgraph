export interface NodeData {
  id: string;
  label: string;
  timestamp: number;
  coords: [number, number];
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
}

export interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
}

const mockGraph: GraphData = {
  nodes: [
    { id: 'a', label: 'A', timestamp: 1710000000000, coords: [-122.4, 37.8] },
    { id: 'b', label: 'B', timestamp: 1710003600000, coords: [-73.9, 40.7] },
    { id: 'c', label: 'C', timestamp: 1710007200000, coords: [2.35, 48.85] },
  ],
  edges: [
    { id: 'ab', source: 'a', target: 'b' },
    { id: 'bc', source: 'b', target: 'c' },
  ],
};

export async function fetchGraph(): Promise<GraphData> {
  return Promise.resolve(mockGraph);
}
