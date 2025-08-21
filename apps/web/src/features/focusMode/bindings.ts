import $ from "jquery";
import { AppDispatch } from "../../store";
import { enterFocus, exitFocus, toggleManual } from "./focusSlice";

export function bindFocusMode($root: JQuery, dispatch: AppDispatch) {
  // Hotkey: F toggles manual, spotlight current hovered pane
  $root.on("keydown", (e: KeyboardEvent) => {
    if ((e as any).code === "KeyF" && !e.repeat) {
      const region = currentRegionFromHover();
      dispatch(toggleManual({ region }));
      $root.trigger("intelgraph:focus:toggled", [region]);
    }
  });

  // Auto triggers from integrations
  $root.on("intelgraph:graph:lasso_start", () =>
    dispatch(enterFocus({ region: "graph", reason: "lasso" })),
  );
  $root.on("intelgraph:graph:lasso_end", () => dispatch(exitFocus()));

  $root.on("intelgraph:codex:edit_start", () =>
    dispatch(enterFocus({ region: "codex", reason: "codex-edit" })),
  );
  $root.on("intelgraph:codex:edit_end", () => dispatch(exitFocus()));

  $root.on("intelgraph:map:draw_start", () =>
    dispatch(enterFocus({ region: "map", reason: "map-draw" })),
  );
  $root.on("intelgraph:map:draw_end", () => dispatch(exitFocus()));

  $root.on("intelgraph:timeline:range_drag_start", () =>
    dispatch(enterFocus({ region: "timeline", reason: "brush" })),
  );
  $root.on("intelgraph:timeline:range_drag_end", () => dispatch(exitFocus()));
}

function currentRegionFromHover(): "graph" | "map" | "timeline" | "codex" {
  const el = document.elementFromPoint(
    window.innerWidth / 2,
    window.innerHeight / 2,
  ) as HTMLElement;
  if (!el) return "graph";
  if (el.closest("#pane-codex")) return "codex";
  if (el.closest("#pane-map")) return "map";
  if (el.closest("#pane-timeline")) return "timeline";
  return "graph";
}
