import React from "react";

const TimelinePanel = ({ events }) => (
  <aside className="timeline-panel">
    <h2>Agent Timeline</h2>
    <ul>
      {events.map((e) => (
        <li key={e.id}>
          <strong>{e.action}</strong> ({e.confidence}) - {e.result}
        </li>
      ))}
    </ul>
  </aside>
);

export default TimelinePanel;
