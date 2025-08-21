import React, { useMemo } from "react";
import { useAppSelector } from "../../store/hooks";

export const FocusOverlay: React.FC = () => {
  const { enabled, activeRegion } = useAppSelector((s) => s.focus);
  const reducedMotion = useMemo(
    () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    [],
  );
  const reducedTransparency = useMemo(
    () =>
      window.matchMedia?.("(prefers-reduced-transparency: reduce)").matches ??
      false,
    [],
  );
  const base = enabled ? "ig-dim-overlay" : "ig-dim-overlay ig-dim-hidden";
  const klass = `${base} ${reducedTransparency ? "ig-no-blur" : ""} ${reducedMotion ? "ig-fast" : ""}`;
  return (
    <>
      {/* One overlay per pane: non-active panes are dimmed */}
      <div
        id="ov-graph"
        className={`${klass} ${activeRegion !== "graph" ? "on" : "off"}`}
      />
      <div
        id="ov-map"
        className={`${klass} ${activeRegion !== "map" ? "on" : "off"}`}
      />
      <div
        id="ov-timeline"
        className={`${klass} ${activeRegion !== "timeline" ? "on" : "off"}`}
      />
      <div
        id="ov-codex"
        className={`${klass} ${activeRegion !== "codex" ? "on" : "off"}`}
      />
    </>
  );
};
