import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import {
  filterTransactions,
  areAllVisibleSelected,
} from "../../app/transactions/filter";
import { fingerprintTransaction } from "./transactionsSlice";
import type { Rule } from "../../app/types";

function deriveKeywordRuleCategories(rules: Rule[]): string[] {
  const set = new Set<string>();
  for (const r of rules) {
    const c = (r.category ?? "").trim();
    if (c) set.add(c);
  }
  if (!set.has("N/A")) set.add("N/A");
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// ── Base selectors ──────────────────────────────────────────────────────────

export const selectTransactions = (state: RootState) =>
  state.transactions.transactions;

export const selectPendingTransactions = (state: RootState) =>
  state.transactions.pendingTransactions;

export const selectBaselineById = (state: RootState) =>
  state.transactions.baselineById;

export const selectSelectedIds = (state: RootState) =>
  state.transactions.selectedIds;

export const selectCategoriesList = (state: RootState) =>
  state.transactions.categoriesList;

export const selectPredictionScores = (state: RootState) =>
  state.transactions.predictionScores;

export const selectTransactionsLoaded = (state: RootState) =>
  state.transactions.loaded;

export const selectFilters = (state: RootState) => state.filters;

export const selectActiveTab = (state: RootState) => state.ui.activeTab;

export const selectKeywordRules = (state: RootState) => state.keywords.rules;

// ── Derived selectors ───────────────────────────────────────────────────────

export const selectSelectedIdsSet = createSelector(
  selectSelectedIds,
  (ids) => new Set(ids),
);

export const selectAvailableYears = createSelector(
  selectTransactions,
  (transactions) => {
    const years = new Set<number>();
    for (const t of transactions) {
      years.add(new Date(t.date).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  },
);

export const selectTransactionCategories = createSelector(
  selectTransactions,
  (transactions) => {
    const set = new Set<string>();
    for (const t of transactions) {
      const c = (t.category ?? "").trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  },
);

export const selectFilteredTransactions = createSelector(
  selectTransactions,
  selectFilters,
  (transactions, filters) => filterTransactions(transactions, filters),
);

export const selectUniquePendingTransactions = createSelector(
  selectPendingTransactions,
  (pending) => {
    const seen = new Set<string>();
    return pending.filter((t) => {
      const key = `${t.date}|${t.description.trim()}|${Number(t.amount)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
);

export const selectDirtyState = createSelector(
  selectTransactions,
  selectBaselineById,
  (transactions, baselineById) => {
    const ids = new Set<string>();
    const dirty = [];
    for (const t of transactions) {
      const baselineFp = baselineById[t.id];
      const currentFp = fingerprintTransaction(t);
      if (!baselineFp || baselineFp !== currentFp) {
        ids.add(t.id);
        dirty.push(t);
      }
    }
    return { dirtyIds: ids, dirtyTransactions: dirty };
  },
);

export const selectAllVisibleSelected = createSelector(
  selectFilteredTransactions,
  selectSelectedIdsSet,
  (filtered, selectedIds) => areAllVisibleSelected(filtered, selectedIds),
);

export const selectKeywordRuleCategories = createSelector(
  selectKeywordRules,
  (rules) => deriveKeywordRuleCategories(rules),
);

export const selectMergedCategories = createSelector(
  selectTransactionCategories,
  selectCategoriesList,
  (transactionCategories, categoriesList) =>
    [...new Set([...transactionCategories, ...categoriesList])].sort(),
);

/** All categories from keyword rules + transactions + default list, deduplicated and sorted. */
export const selectAllCategories = createSelector(
  selectKeywordRuleCategories,
  selectMergedCategories,
  (keywordCategories, mergedCategories) =>
    [...new Set([...keywordCategories, ...mergedCategories])].sort(),
);
