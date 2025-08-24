import React from 'react';
import './styles.css';

export default function App() {
  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh' }}>
      <div id="graph-pane" style={{ flex: 1, border: '1px solid black' }}>Graph</div>
      <div id="timeline-pane" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '30%', border: '1px solid black' }}>Timeline</div>
      <div id="map-pane" style={{ flex: 1, border: '1px solid black' }}>Map</div>
    </div>
  );
}
