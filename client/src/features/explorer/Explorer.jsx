import React, { useEffect } from "react";
import { ExplorerProvider, useExplorer } from "./ExplorerContext";
import TimelinePane from "./TimelinePane";
import MapPane from "./MapPane";
import GraphPane from "./GraphPane";

function ExplorerInner() {
  const { dispatch } = useExplorer();
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "1") dispatch({ type: "pane", pane: "timeline" });
      if (e.key === "2") dispatch({ type: "pane", pane: "map" });
      if (e.key === "3") dispatch({ type: "pane", pane: "graph" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch]);

  return (
    <div className="flex flex-col h-full" aria-label="Tri-pane Explorer">
      <div className="flex flex-row flex-grow">
        <div className="w-1/3">
          <TimelinePane />
        </div>
        <div className="w-1/3">
          <MapPane />
        </div>
        <div className="w-1/3">
          <GraphPane />
        </div>
      </div>
    </div>
  );
}

const Explorer = () => (
  <ExplorerProvider>
    <ExplorerInner />
  </ExplorerProvider>
);

export default Explorer;
