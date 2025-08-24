import React, { useEffect } from "react";
import { useExplorer } from "./ExplorerContext";
import { explorerData } from "./data";

const TimelinePane = () => {
  const { state, dispatch } = useExplorer();
  const { selected, timeRange, activePane } = state;
  const visible = explorerData.filter(
    (d) => d.year >= timeRange[0] && d.year <= timeRange[1],
  );

  useEffect(() => {
    if (activePane !== "timeline") return;
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
      aria-label="Timeline"
      className={`p-2 border ${
        activePane === "timeline" ? "border-blue-500" : "border-transparent"
      }`}
    >
      <div className="mb-2">
        <label htmlFor="start">Start {timeRange[0]}</label>
        <input
          id="start"
          type="range"
          min="2020"
          max="2022"
          value={timeRange[0]}
          onChange={(e) =>
            dispatch({ type: "time", range: [Number(e.target.value), timeRange[1]] })
          }
        />
        <label htmlFor="end">End {timeRange[1]}</label>
        <input
          id="end"
          type="range"
          min="2020"
          max="2022"
          value={timeRange[1]}
          onChange={(e) =>
            dispatch({ type: "time", range: [timeRange[0], Number(e.target.value)] })
          }
        />
      </div>
      <ul>
        {visible.map((ev) => (
          <li key={ev.id}>
            <button
              onClick={() => dispatch({ type: "select", id: ev.id })}
              className={`text-left w-full ${
                selected === ev.id ? "font-bold" : ""
              }`}
            >
              {ev.year}: {ev.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TimelinePane;
