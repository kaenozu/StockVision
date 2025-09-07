import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import stocksReducer from './slices/stocksSlice';
import portfolioReducer from './slices/portfolioSlice';
import authReducer from './slices/authSlice';
import settingsReducer from './slices/settingsSlice';
import predictionsReducer from './slices/predictionsSlice';

export const store = configureStore({
  reducer: {
    stocks: stocksReducer,
    portfolio: portfolioReducer,
    auth: authReducer,
    settings: settingsReducer,
    predictions: predictionsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;