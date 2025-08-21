import $ from "jquery";
import { AppDispatch } from "../store";
import { open, setPolicy } from "../features/explain/explainSlice";

export function attachHistoryExplainBridge($root: JQuery, dispatch: AppDispatch){
  $root.on("intelgraph:explain:open", (_e, policy)=>{ dispatch(setPolicy(policy||[])); dispatch(open()); });
  $root.on("intelgraph:history:apply", (_e, payload)=>{ /* optional hooks for panes */ });
}
