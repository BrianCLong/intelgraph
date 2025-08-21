import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type FocusMode = "auto" | "manual" | "off";
export type FocusRegion = "graph" | "map" | "timeline" | "codex" | "none";
export interface FocusState {
  mode: FocusMode;
  enabled: boolean; // whether currently dimming is active
  activeRegion: FocusRegion; // spotlight target
  reason?: string; // e.g., "text-edit", "lasso", "codex-edit"
}

const initialState: FocusState = {
  mode: "auto",
  enabled: false,
  activeRegion: "none",
};

const slice = createSlice({
  name: "focus",
  initialState,
  reducers: {
    setMode(s, a: PayloadAction<FocusMode>) {
      s.mode = a.payload;
    },
    enterFocus(s, a: PayloadAction<{ region: FocusRegion; reason?: string }>) {
      s.enabled = true;
      s.activeRegion = a.payload.region;
      s.reason = a.payload.reason;
    },
    exitFocus(s) {
      s.enabled = false;
      s.activeRegion = "none";
      s.reason = undefined;
    },
    toggleManual(s, a: PayloadAction<{ region: FocusRegion }>) {
      if (s.mode !== "off") {
        s.enabled = !s.enabled;
        s.activeRegion = a.payload.region;
      }
    },
  },
});
export const { setMode, enterFocus, exitFocus, toggleManual } = slice.actions;
export default slice.reducer;
