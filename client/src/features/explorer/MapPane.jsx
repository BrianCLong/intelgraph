import React, { useEffect } from "react";
import { useExplorer } from "./ExplorerContext";
import { explorerData } from "./data";

const MapPane = () => {
  const { state, dispatch } = useExplorer();
  const { selected, timeRange, activePane } = state;
  const visible = explorerData.filter(
    (d) => d.year >= timeRange[0] && d.year <= timeRange[1],
  );

  useEffect(() => {
    if (activePane !== "map") return;
    const handler = (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!visible.length) return;
        const idx = visible.findIndex((v) => v.id === selected);
        const nextIdx =
          e.key === "ArrowDown"
            ? (idx + 1) % visible.length
            : (idx - 1 + visible.length) % visible.length;
        dispatch({ type: "select", id: visible[nextIdx].id });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activePane, visible, selected, dispatch]);

  return (
    <div
      role="region"
      aria-label="Map"
      className={`p-2 border ${
        activePane === "map" ? "border-blue-500" : "border-transparent"
      }`}
    >
      <ul>
        {visible.map((ev) => (
          <li key={ev.id}>
            <button
              onClick={() => dispatch({ type: "select", id: ev.id })}
              className={`text-left w-full ${
                selected === ev.id ? "font-bold" : ""
              }`}
            >
              {ev.label} ({ev.lat}, {ev.lon})
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MapPane;
