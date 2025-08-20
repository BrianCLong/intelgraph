import { createSlice } from '@reduxjs/toolkit';

const activeMeasuresSlice = createSlice({
  name: 'activeMeasures',
  initialState: { portfolio: [], tuners: { proportionality: 0.5 } },
  reducers: {
    updateTuners: (state, action) => { state.tuners = action.payload; },
    setPortfolio: (state, action) => { state.portfolio = action.payload; },
  },
});

export const { updateTuners, setPortfolio } = activeMeasuresSlice.actions;
export default activeMeasuresSlice.reducer;