import { useState, useEffect } from 'react';
import Graph from './Graph';
import TimelinePanel from './TimelinePanel';
import './App.css';

interface EventItem {
  id: string;
  action: string;
  confidence: number;
  result: string;
}

interface NodeElement {
  data: {
    id: string;
    label: string;
    type: string;
    deception_score: number;
  };
}

interface EdgeElement {
  data: {
    source: string;
    target: string;
    label: string;
  };
}

interface GraphData {
  nodes: NodeElement[];
  edges: EdgeElement[];
}

function App() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [neighborhoodMode, setNeighborhoodMode] = useState<boolean>(false);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data) => {
        const formattedNodes = data.nodes.map((n: any) => ({
          data: {
            id: n.id,
            label: n.properties.text || n.properties.name,
            type: n.label,
            deception_score: n.properties.deception_score || 0,
          },
        }));
        const formattedEdges = data.edges.map((e: any) => ({
          data: { source: e.source, target: e.target, label: e.type },
        }));
        setGraphData({ nodes: formattedNodes, edges: formattedEdges });
      })
      .catch((err) => console.error('Failed to fetch graph data:', err));
  }, []);

  useEffect(() => {
    fetch('/api/agent-actions')
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error('Failed to fetch agent actions:', err));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>IntelGraph</h1>
        <button onClick={() => setNeighborhoodMode((m) => !m)}>
          {neighborhoodMode ? 'Show Full Graph' : 'Neighborhood Mode'}
        </button>
      </header>
      <main>
        <Graph elements={graphData} neighborhoodMode={neighborhoodMode} />
        <TimelinePanel events={events} />
      </main>
    </div>
  );
}

export default App;
