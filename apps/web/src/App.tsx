import React from 'react';
import GraphPane from './panes/GraphPane';
import MapPane from './panes/MapPane';
import TimelinePane from './panes/TimelinePane';
import ExplainPanel from './panes/ExplainPanel';
import './styles/tri-pane.css';

export default function App() {
  return (
    <div id="tri-pane" className="tri-grid">
      <section id="pane-graph" aria-label="Graph">
        <GraphPane />
      </section>
      <section id="pane-map" aria-label="Map">
        <MapPane />
      </section>
      <section id="pane-timeline" aria-label="Timeline">
        <TimelinePane />
      </section>
      <aside id="pane-explain" aria-label="Explain">
        <ExplainPanel />
      </aside>
    </div>
  );
}
