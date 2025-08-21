import { createSlice } from "@reduxjs/toolkit";
import { createSelector } from "@reduxjs/toolkit";
import { selectActiveQuery } from "../viewSync/viewSyncSlice";

export interface PolicyItem { id:string; message:string; severity:"info"|"warn"|"block"; }
export interface ExplainState { open:boolean; policy: PolicyItem[]; }

const initial: ExplainState = { open: true, policy: [] };
const slice = createSlice({
  name: "explain",
  initialState: initial,
  reducers: {
    open: (s)=>{ s.open = true; },
    close: (s)=>{ s.open = false; },
    setPolicy: (s, a)=>{ s.policy = a.payload as PolicyItem[]; }
  }
});
export const { open, close, setPolicy } = slice.actions;
export default slice.reducer;

export const selectExplain = (st:any)=> st.explain as ExplainState;
export const selectExplainModel = createSelector(
  [selectActiveQuery, selectExplain],
  (query, expl) => ({ query, policy: expl.policy })
);
