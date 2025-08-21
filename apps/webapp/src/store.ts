import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SelectionState {
  selectedNodeId: string | null;
  timeRange: [number, number] | null;
}

const initialState: SelectionState = { selectedNodeId: null, timeRange: null };

const selectionSlice = createSlice({
  name: 'selection',
  initialState,
  reducers: {
    selectNode(state, action: PayloadAction<string | null>) {
      state.selectedNodeId = action.payload;
    },
    setTimeRange(state, action: PayloadAction<[number, number] | null>) {
      state.timeRange = action.payload;
    },
  },
});

export const { selectNode, setTimeRange } = selectionSlice.actions;

export const store = configureStore({
  reducer: { selection: selectionSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
