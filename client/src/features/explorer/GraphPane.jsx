import React, { useEffect } from "react";
import { useExplorer } from "./ExplorerContext";
import { explorerData } from "./data";

const edges = [
  { id: "e1-e2", source: "e1", target: "e2" },
  { id: "e2-e3", source: "e2", target: "e3" },
];

const GraphPane = () => {
  const { state, dispatch } = useExplorer();
  const { selected, timeRange, activePane } = state;
  const visibleNodes = explorerData.filter(
    (d) => d.year >= timeRange[0] && d.year <= timeRange[1],
  );
  const visibleIds = visibleNodes.map((n) => n.id);
  const visibleEdges = edges.filter(
    (e) => visibleIds.includes(e.source) && visibleIds.includes(e.target),
  );

  useEffect(() => {
    if (activePane !== "graph") return;
    const handler = (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!visibleNodes.length) return;
        const idx = visibleNodes.findIndex((v) => v.id === selected);
        const nextIdx =
          e.key === "ArrowDown"
            ? (idx + 1) % visibleNodes.length
            : (idx - 1 + visibleNodes.length) % visibleNodes.length;
        dispatch({ type: "select", id: visibleNodes[nextIdx].id });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activePane, visibleNodes, selected, dispatch]);

  return (
    <div
      role="region"
      aria-label="Graph"
      className={`p-2 border ${
        activePane === "graph" ? "border-blue-500" : "border-transparent"
      }`}
    >
      <ul>
        {visibleNodes.map((n) => (
          <li key={n.id}>
            <button
              onClick={() => dispatch({ type: "select", id: n.id })}
              className={`text-left w-full ${
                selected === n.id ? "font-bold" : ""
              }`}
            >
              {n.label}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-sm mt-2">
        Edges: {visibleEdges.map((e) => `${e.source}-${e.target}`).join(", ") || "None"}
      </p>
    </div>
  );
};

export default GraphPane;
