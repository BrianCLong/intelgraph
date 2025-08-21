import { configureStore } from '@reduxjs/toolkit';
import viewSync from '../features/viewSync/viewSyncSlice';

export const store = configureStore({ reducer: { viewSync } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
