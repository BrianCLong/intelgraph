import { createContext, useContext, useReducer } from "react";

const ExplorerContext = createContext(null);

const initialState = {
  selected: null,
  timeRange: [2020, 2022],
  activePane: "timeline",
};

function reducer(state, action) {
  switch (action.type) {
    case "select":
      return { ...state, selected: action.id };
    case "time":
      return { ...state, timeRange: action.range };
    case "pane":
      return { ...state, activePane: action.pane };
    default:
      return state;
  }
}

export function ExplorerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <ExplorerContext.Provider value={{ state, dispatch }}>
      {children}
    </ExplorerContext.Provider>
  );
}

export function useExplorer() {
  const ctx = useContext(ExplorerContext);
  if (!ctx) throw new Error("useExplorer must be used within ExplorerProvider");
  return ctx;
}
