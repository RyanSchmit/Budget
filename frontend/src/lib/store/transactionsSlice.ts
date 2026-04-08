import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Transaction } from "../../app/types";
import { defaultCategories } from "../../app/transactions/categories";

export function fingerprintTransaction(t: Transaction) {
  return `${t.date}|${t.description}|${t.category ?? "N/A"}|${Number(t.amount)}`;
}

function getTransactionKey(t: Transaction) {
  return `${t.date}|${t.description}|${t.amount}`;
}

interface TransactionsState {
  transactions: Transaction[];
  pendingTransactions: Transaction[];
  baselineById: Record<string, string>;
  selectedIds: string[];
  categoriesList: string[];
  loaded: boolean;
  predictionScores: Record<string, number>;
}

const initialState: TransactionsState = {
  transactions: [],
  pendingTransactions: [],
  baselineById: {},
  selectedIds: [],
  categoriesList: defaultCategories,
  loaded: false,
  predictionScores: {},
};

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    setTransactions(state, action: PayloadAction<Transaction[]>) {
      state.transactions = action.payload;
    },
    setPendingTransactions(state, action: PayloadAction<Transaction[]>) {
      state.pendingTransactions = action.payload;
    },
    loadTransactionsSuccess(state, action: PayloadAction<Transaction[]>) {
      state.transactions = action.payload;
      state.selectedIds = [];
      state.loaded = true;
      state.predictionScores = {};
      const next: Record<string, string> = {};
      for (const t of action.payload) {
        next[t.id] = fingerprintTransaction(t);
      }
      state.baselineById = next;
    },
    applyFreshBaseline(state, action: PayloadAction<Transaction[]>) {
      const next: Record<string, string> = {};
      for (const t of action.payload) {
        next[t.id] = fingerprintTransaction(t);
      }
      state.baselineById = next;
    },
    updateBaselineForSaved(state, action: PayloadAction<Transaction[]>) {
      for (const t of action.payload) {
        state.baselineById[t.id] = fingerprintTransaction(t);
      }
    },
    addPendingToTransactions(state) {
      const seen = new Set<string>();
      const unique = state.pendingTransactions.filter((t) => {
        const key = getTransactionKey(t);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (unique.length === 0) {
        state.pendingTransactions = [];
        return;
      }
      const existingKeys = new Set(state.transactions.map(getTransactionKey));
      const toAdd = unique.filter(
        (t) => !existingKeys.has(getTransactionKey(t)),
      );
      state.transactions = [...state.transactions, ...toAdd];
      state.pendingTransactions = [];
    },
    updateTransaction(
      state,
      action: PayloadAction<{
        id: string;
        field: keyof Transaction;
        value: string | number;
      }>,
    ) {
      const { id, field, value } = action.payload;
      const idx = state.transactions.findIndex((t) => t.id === id);
      if (idx !== -1) {
        (state.transactions[idx] as Record<string, unknown>)[field] = value;
      }
    },
    replaceTransaction(
      state,
      action: PayloadAction<{ oldId: string; newTransaction: Transaction }>,
    ) {
      const { oldId, newTransaction } = action.payload;
      const idx = state.transactions.findIndex((t) => t.id === oldId);
      if (idx !== -1) {
        state.transactions[idx] = newTransaction;
      }
      // Update baseline: remove old key, add new
      if (state.baselineById[oldId] !== undefined) {
        delete state.baselineById[oldId];
      }
      state.baselineById[newTransaction.id] = fingerprintTransaction(newTransaction);
      // Update selection if needed
      const selIdx = state.selectedIds.indexOf(oldId);
      if (selIdx !== -1) {
        state.selectedIds[selIdx] = newTransaction.id;
      }
    },
    removeTransactionsByIds(state, action: PayloadAction<string[]>) {
      const ids = new Set(action.payload);
      state.transactions = state.transactions.filter((t) => !ids.has(t.id));
      state.selectedIds = state.selectedIds.filter((id) => !ids.has(id));
    },
    toggleSelectId(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.selectedIds.indexOf(id);
      if (idx === -1) {
        state.selectedIds.push(id);
      } else {
        state.selectedIds.splice(idx, 1);
      }
    },
    setSelectedIds(state, action: PayloadAction<string[]>) {
      state.selectedIds = action.payload;
    },
    clearSelectedIds(state) {
      state.selectedIds = [];
    },
    setCategoriesList(state, action: PayloadAction<string[]>) {
      state.categoriesList = action.payload;
    },
    setPredictionScores(state, action: PayloadAction<Record<string, number>>) {
      Object.assign(state.predictionScores, action.payload);
    },
    clearPredictionScore(state, action: PayloadAction<string>) {
      delete state.predictionScores[action.payload];
    },
    clearAllPredictionScores(state) {
      state.predictionScores = {};
    },
  },
});

export const {
  setTransactions,
  setPendingTransactions,
  loadTransactionsSuccess,
  applyFreshBaseline,
  updateBaselineForSaved,
  addPendingToTransactions,
  updateTransaction,
  replaceTransaction,
  removeTransactionsByIds,
  toggleSelectId,
  setSelectedIds,
  clearSelectedIds,
  setCategoriesList,
  setPredictionScores,
  clearPredictionScore,
  clearAllPredictionScores,
} = transactionsSlice.actions;

export default transactionsSlice.reducer;
