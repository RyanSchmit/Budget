import { configureStore } from "@reduxjs/toolkit";
import transactionsReducer from "./transactionsSlice";
import filtersReducer from "./filtersSlice";
import uiReducer from "./uiSlice";
import keywordsReducer from "./keywordsSlice";

export const store = configureStore({
  reducer: {
    transactions: transactionsReducer,
    filters: filtersReducer,
    ui: uiReducer,
    keywords: keywordsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
