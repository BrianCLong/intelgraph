import { configureStore } from "@reduxjs/toolkit";
import focusReducer from "../features/focusMode/focusSlice";
import viewSyncReducer from "../features/viewSync/viewSyncSlice";
import codexReducer from "../features/codex/codexSlice";
import historyReducer from "../features/history/historySlice";
import { historyMiddleware } from "../features/history/historyMiddleware";
import { enablePatches } from "immer";

enablePatches();

export const store = configureStore({
  reducer: {
    focus: focusReducer,
    viewSync: viewSyncReducer,
    codex: codexReducer,
    history: historyReducer,
  },
  middleware: (gDM) => gDM().concat(historyMiddleware),
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
