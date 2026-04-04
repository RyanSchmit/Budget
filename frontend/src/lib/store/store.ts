import { configureStore } from "@reduxjs/toolkit";
import transactionsReducer from "./transactionsSlice";
import filtersReducer from "./filtersSlice";
import uiReducer from "./uiSlice";
import keywordsReducer from "./keywordsSlice";
import preferencesReducer from "./preferencesSlice";

export const store = configureStore({
  reducer: {
    transactions: transactionsReducer,
    filters: filtersReducer,
    ui: uiReducer,
    keywords: keywordsReducer,
    preferences: preferencesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
