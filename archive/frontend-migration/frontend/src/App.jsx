import { useState, useEffect } from 'react';
import Graph from './Graph';
import TimelinePanel from './TimelinePanel';
import './App.css';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [neighborhoodMode, setNeighborhoodMode] = useState(false);
  const [events, setEvents] = useState([]);
  const [showForecast, setShowForecast] = useState(false);
  const [forecastEdges, setForecastEdges] = useState([]);
  const [forecastIndex, setForecastIndex] = useState(0);

  useEffect(() => {
    fetch('/api/graph')
      .then((res) => res.json())
      .then((data) => {
        const formattedNodes = data.nodes.map((n) => ({
          data: {
            id: n.id,
            label: n.properties.text || n.properties.name,
            type: n.label,
            deception_score: n.properties.deception_score || 0,
          },
        }));
        const formattedEdges = data.edges.map((e) => ({
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

  const toggleForecast = () => {
    const next = !showForecast;
    setShowForecast(next);
    if (next && forecastEdges.length === 0) {
      const entityId = graphData.nodes[0]?.data.id;
      if (!entityId) return;
      fetch(`/api/forecast/graph?entity_id=${entityId}&past_days=14&future_days=30`)
        .then((res) => res.json())
        .then((data) => {
          const formatted = data.edges.map((e, idx) => ({
            data: {
              source: e.source,
              target: e.target,
              label: `ETA: ${e.timestamp}`,
            },
            classes: 'forecast',
            id: `forecast-${idx}`,
          }));
          setForecastEdges(formatted);
          setForecastIndex(formatted.length - 1);
        })
        .catch((err) => console.error('Failed to fetch forecast:', err));
    }
  };

  const displayedForecastEdges = showForecast ? forecastEdges.slice(0, forecastIndex + 1) : [];
  const combinedEdges = graphData.edges.concat(displayedForecastEdges);

  return (
    <div className="App">
      <header className="App-header">
        <h1>IntelGraph</h1>
        <button onClick={() => setNeighborhoodMode((m) => !m)}>
          {neighborhoodMode ? 'Show Full Graph' : 'Neighborhood Mode'}
        </button>
        <button onClick={toggleForecast}>{showForecast ? 'Hide Forecast' : 'Forecast View'}</button>
      </header>
      <main>
        <Graph
          elements={{ nodes: graphData.nodes, edges: combinedEdges }}
          neighborhoodMode={neighborhoodMode}
        />
        {showForecast && forecastEdges.length > 0 && (
          <input
            type="range"
            min="0"
            max={forecastEdges.length - 1}
            value={forecastIndex}
            onChange={(e) => setForecastIndex(Number(e.target.value))}
          />
        )}
        <TimelinePanel events={events} />
      </main>
    </div>
  );
}

export default App;
