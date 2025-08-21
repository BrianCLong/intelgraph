import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import graphSlice from './slices/graphSlice';
import uiSlice from './slices/uiSlice';
import graphInteraction from './slices/graphInteractionSlice';
import graphUISlice from './slices/graphUISlice'; // Import the new graphUISlice
import aiInsightsReducer from './slices/aiInsightsSlice'; // Import the new aiInsightsSlice
import timelineReducer from './slices/timelineSlice';
import graphData from './graphSlice';
import socket from './socketSlice';
import codexReducer from '../features/codex/codexSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    graph: graphSlice,
    timeline: timelineReducer,
    ui: uiSlice,
    graphInteraction,
    graphUI: graphUISlice, // Add the new graphUISlice
    aiInsights: aiInsightsReducer, // Add the new aiInsightsReducer
    graphData,
    socket,
    codex: codexReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});
