import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';

export interface TimeRange {
  start: string;
  end: string;
}
export interface ViewSyncState {
  timeRange: TimeRange | null;
  selectedNodeIds: string[];
  selectedGeoBounds?: [number, number, number, number] | null; // [west,south,east,north]
  filters: Record<string, unknown>;
}
const initial: ViewSyncState = {
  timeRange: null,
  selectedNodeIds: [],
  selectedGeoBounds: null,
  filters: {},
};

const slice = createSlice({
  name: 'viewSync',
  initialState: initial,
  reducers: {
    setTimeRange: (s, a: PayloadAction<TimeRange>) => {
      s.timeRange = a.payload;
    },
    setSelectedNodeIds: (s, a: PayloadAction<string[]>) => {
      s.selectedNodeIds = a.payload;
    },
    setGeoBounds: (s, a: PayloadAction<[number, number, number, number] | null>) => {
      s.selectedGeoBounds = a.payload;
    },
    setFilters: (s, a: PayloadAction<Record<string, unknown>>) => {
      s.filters = { ...s.filters, ...a.payload };
    },
  },
});
export const { setTimeRange, setSelectedNodeIds, setGeoBounds, setFilters } = slice.actions;
export default slice.reducer;

export const selectTimeRange = (st: any) => (st.viewSync as ViewSyncState).timeRange;
export const selectGeoBounds = (st: any) => (st.viewSync as ViewSyncState).selectedGeoBounds;
export const selectSelectedNodeIds = (st: any) => (st.viewSync as ViewSyncState).selectedNodeIds;

export const selectActiveQuery = createSelector(
  [selectTimeRange, selectGeoBounds, (st: any) => (st.viewSync as ViewSyncState).filters],
  (tr, bbox, filters) => ({ time: tr, bbox, ...filters }),
);
