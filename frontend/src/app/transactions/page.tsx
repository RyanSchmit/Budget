"use client";

import Navbar from "../Navbar";
import { useCallback, useRef } from "react";
import { Transaction } from "../types";
import FileUI from "./csv";
import ManualEntryForm from "./ManualEntryForm";
import LoadTransactionsClient from "./LoadTransactionsClient";
import { FilterBar } from "./filter";
import TransactionsTable from "./table";
import KeywordsTab from "./keywords/KeywordsTab";
import AccruedManager from "./AccruedManager";
import SelectionKeywordToolbar from "./keywords/SelectionKeywordToolbar";
import SaveButton from "./save";
import DeleteSelectedButton from "./delete";
import ExportButton from "./export";
import { loadTransactions } from "./loadTransactions";
import { rulePredict } from "./keywords/keywordSearch";
import { buildTfidfModel, TfidfModel } from "./tfidfModel";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
  loadTransactionsSuccess,
  setPendingTransactions,
  addPendingToTransactions,
  updateTransaction,
  updateBaselineForSaved,
  replaceTransaction,
  removeTransactionsByIds,
  setTransactions,
  setPredictionScores,
} from "../../lib/store/transactionsSlice";
import {
  setSearchQuery,
  setCategoryFilter,
  setStartDate,
  setEndDate,
  setShowDateFilter,
  setMonth,
  setYear,
  setExpensesOnly,
  setIncomeOnly,
} from "../../lib/store/filtersSlice";
import { setActiveTab } from "../../lib/store/uiSlice";
import {
  selectFilteredTransactions,
  selectAvailableYears,
  selectTransactionCategories,
  selectUniquePendingTransactions,
  selectDirtyState,
  selectFilters,
  selectActiveTab,
  selectTransactions,
  selectSelectedIds,
  selectKeywordRules,
  selectBaselineById,
} from "../../lib/store/selectors";

export default function Transactions() {
  const dispatch = useAppDispatch();
  const selectionContainerRef = useRef<HTMLDivElement>(null);

  const transactions = useAppSelector(selectTransactions);
  const selectedIds = useAppSelector(selectSelectedIds);
  const filters = useAppSelector(selectFilters);
  const activeTab = useAppSelector(selectActiveTab);
  const filteredTransactions = useAppSelector(selectFilteredTransactions);
  const availableYears = useAppSelector(selectAvailableYears);
  const categories = useAppSelector(selectTransactionCategories);
  const uniquePendingTransactions = useAppSelector(
    selectUniquePendingTransactions,
  );
  const { dirtyTransactions } = useAppSelector(selectDirtyState);
  const keywordRules = useAppSelector(selectKeywordRules);
  const baselineById = useAppSelector(selectBaselineById);

  const minScore = 0.22;

  // Cache the TF-IDF model in memory so we don't rebuild on every predict click
  // when training data hasn't changed.
  const modelCacheRef = useRef<{ key: string; model: TfidfModel } | null>(null);

  const reloadFromDb = useCallback(async () => {
    const fresh = await loadTransactions();
    dispatch(loadTransactionsSuccess(fresh));
  }, [dispatch]);

  // Core prediction logic, extracted so it can be called from handlePredict
  // AND from handleCategoryChange (re-train on correction).
  const runTfidf = useCallback(
    async (
      currentTransactions: Transaction[],
      targetIds: Set<string>,
      currentMinScore: number,
    ) => {
      // Build (or reuse cached) TF-IDF model from all categorized transactions
      const labeled = currentTransactions.filter(
        (t) => t.category && t.category !== "N/A",
      );
      const cacheKey = labeled.map((t) => `${t.id}:${t.category}`).join("|");

      let model: TfidfModel | null;
      if (modelCacheRef.current?.key === cacheKey) {
        model = modelCacheRef.current.model;
      } else {
        model = buildTfidfModel(
          labeled.map((t) => ({
            description: t.description,
            category: t.category,
            amount: t.amount,
          })),
        );
        if (model) modelCacheRef.current = { key: cacheKey, model };
      }

      if (!model) return currentTransactions;

      // Collect N/A transactions in scope
      const remaining = currentTransactions
        .filter((t) => targetIds.has(t.id))
        .filter((t) => {
          const c = (t.category ?? "").trim();
          return !c || c === "N/A";
        })
        .map((t) => ({ transact_id: t.id, description: t.description, amount: t.amount }));

      if (remaining.length === 0) return currentTransactions;

      const cpu =
        typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 1;
      const workerCount = Math.max(
        1,
        Math.min(8, Math.floor((cpu ?? 4) - 1), remaining.length),
      );

      const chunkSize = Math.ceil(remaining.length / workerCount);
      const chunks: (typeof remaining)[] = [];
      for (let i = 0; i < remaining.length; i += chunkSize) {
        chunks.push(remaining.slice(i, i + chunkSize));
      }

      const makeWorker = () =>
        new Worker(new URL("./tfidfPredict.worker.ts", import.meta.url), {
          type: "module",
        });

      const results = await Promise.all(
        chunks.map(
          (items) =>
            new Promise<
              Array<{ transact_id: string; category: string; score: number }>
            >((resolve) => {
              const w = makeWorker();
              const cleanup = () => w.terminate();

              w.onmessage = (ev) => {
                cleanup();
                const payload = ev.data as { predictions?: unknown };
                const preds = Array.isArray(payload?.predictions)
                  ? (payload.predictions as Array<{
                      transact_id: string;
                      category: string;
                      score: number;
                    }>)
                  : [];
                resolve(preds);
              };
              w.onerror = () => {
                cleanup();
                resolve([]);
              };

              w.postMessage({ model, items, minScore: currentMinScore });
            }),
        ),
      );

      const byId = new Map(
        results.flat().map((p) => [p.transact_id, p] as const),
      );

      // Apply TF-IDF predictions
      const withTfidf = currentTransactions.map((t) => {
        const p = byId.get(t.id);
        if (!p) return t;
        const current = (t.category ?? "").trim();
        if (current && current !== "N/A") return t;
        if (!p.category || p.category === "N/A") return t;
        return { ...t, category: p.category };
      });

      // Dispatch scores for TF-IDF predictions
      const scores: Record<string, number> = {};
      for (const [id, p] of byId) {
        if (p.category && p.category !== "N/A") scores[id] = p.score;
      }
      if (Object.keys(scores).length > 0) {
        dispatch(setPredictionScores(scores));
      }

      return withTfidf;
    },
    [dispatch],
  );

  const handlePredict = useCallback(async () => {
    const targetIds =
      selectedIds.length > 0
        ? new Set(selectedIds)
        : new Set(filteredTransactions.map((t) => t.id));

    if (targetIds.size === 0) return;

    const rules = keywordRules;

    // Pass 1 (client): keyword rules (fast, deterministic)
    const afterKeyword = transactions.map((t) => {
      if (!targetIds.has(t.id)) return t;

      const current = (t.category ?? "").trim();
      if (current && current !== "N/A") return t;

      const predicted = rulePredict(t.description, t.amount, rules);
      if (!predicted || predicted === "N/A") return t;

      return { ...t, category: predicted };
    });
    dispatch(setTransactions(afterKeyword));

    // Pass 2 + 3: TF-IDF then LLM
    const final = await runTfidf(afterKeyword, targetIds, minScore);
    dispatch(setTransactions(final));
  }, [
    filteredTransactions,
    selectedIds,
    transactions,
    keywordRules,
    minScore,
    runTfidf,
    dispatch,
  ]);

  // Re-run TF-IDF + LLM on remaining N/A transactions whenever a category is
  // manually corrected. Uses the about-to-be-updated category so the model
  // immediately benefits from the correction.
  const handleCategoryChange = useCallback(
    async (changedId: string, newCategory: string) => {
      if (!newCategory || newCategory === "N/A" || newCategory === "__NEW__") return;

      // Build updated list with the manual correction applied
      const updated = transactions.map((t) =>
        t.id === changedId ? { ...t, category: newCategory } : t,
      );

      const naIds = new Set(
        updated
          .filter((t) => !t.category || t.category === "N/A")
          .map((t) => t.id),
      );
      if (naIds.size === 0) return;

      // Invalidate model cache since training data just changed
      modelCacheRef.current = null;

      const final = await runTfidf(updated, naIds, minScore);
      dispatch(setTransactions(final));
    },
    [transactions, minScore, runTfidf, dispatch],
  );

  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <Navbar />

      <main className="pt-20 flex min-h-screen w-full flex-col items-center gap-8">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-4 flex items-center gap-6 border-b border-gray-800 pb-2">
            <nav
              className="flex gap-1"
              role="tablist"
              aria-label="Transactions tabs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "transactions"}
                onClick={() => dispatch(setActiveTab("transactions"))}
                className={`rounded-t-md px-4 py-2 text-sm font-medium ${
                  activeTab === "transactions"
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                }`}
              >
                Transactions
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "keywords"}
                onClick={() => dispatch(setActiveTab("keywords"))}
                className={`rounded-t-md px-4 py-2 text-sm font-medium ${
                  activeTab === "keywords"
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                }`}
              >
                Keywords
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "accrued"}
                onClick={() => dispatch(setActiveTab("accrued"))}
                className={`rounded-t-md px-4 py-2 text-sm font-medium ${
                  activeTab === "accrued"
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                }`}
              >
                Accrued
              </button>
            </nav>
          </div>

          {activeTab === "transactions" ? (
            <>
              <div ref={selectionContainerRef}>
                <LoadTransactionsClient
                  onLoaded={(txs: Transaction[]) => {
                    dispatch(loadTransactionsSuccess(txs));
                  }}
                />

                {/* CSV upload + manual entry */}
                <div className="mt-4 flex flex-wrap items-center gap-6">
                  <FileUI
                    pendingCount={uniquePendingTransactions.length}
                    onParsed={(txs) => dispatch(setPendingTransactions(txs))}
                    onAdd={() => dispatch(addPendingToTransactions())}
                  />
                  <ManualEntryForm />
                </div>

                {/* Filter bar + action buttons — same row */}
                <div className="mt-4 flex items-start justify-between gap-4">
                  <FilterBar
                    transactionsCount={transactions.length}
                    filteredCount={filteredTransactions.length}
                    categories={categories}
                    availableYears={availableYears}
                    filters={filters}
                    setSearchQuery={(v) => dispatch(setSearchQuery(v))}
                    setCategoryFilter={(v) => dispatch(setCategoryFilter(v))}
                    setStartDate={(v) => dispatch(setStartDate(v))}
                    setEndDate={(v) => dispatch(setEndDate(v))}
                    setMonth={(v) => dispatch(setMonth(v))}
                    setYear={(v) => dispatch(setYear(v))}
                    setExpensesOnly={(v) => dispatch(setExpensesOnly(v))}
                    setIncomeOnly={(v) => dispatch(setIncomeOnly(v))}
                    showDateFilter={filters.showDateFilter}
                    setShowDateFilter={(v) => dispatch(setShowDateFilter(v))}
                  />

                  {transactions.length > 0 && (
                    <div className="flex-shrink-0 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePredict}
                        disabled={
                          (selectedIds.length === 0 &&
                            filteredTransactions.length === 0) ||
                          transactions.length === 0
                        }
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          selectedIds.length > 0
                            ? "Predict categories for selected rows (keywords → TF-IDF)"
                            : "Predict categories for all visible rows (keywords → TF-IDF)"
                        }
                      >
                        Predict
                      </button>

                      <SaveButton
                        transactions={dirtyTransactions}
                        baselineById={baselineById}
                        onSaved={(saved) => {
                          if (!saved.length) return;
                          dispatch(updateBaselineForSaved(saved));
                        }}
                        onCreated={(oldId, newTransaction) => {
                          dispatch(replaceTransaction({ oldId, newTransaction }));
                        }}
                        onSkipped={(oldId) => {
                          dispatch(removeTransactionsByIds([oldId]));
                        }}
                      />

                      <ExportButton transactions={filteredTransactions} />

                      <DeleteSelectedButton reloadFromDb={reloadFromDb} />
                    </div>
                  )}
                </div>

                <div className="mb-8 mt-8">
                  <TransactionsTable onCategoryChange={handleCategoryChange} />
                </div>
              </div>

              <SelectionKeywordToolbar
                containerRef={selectionContainerRef}
                onSetTransactionCategory={(transactId, category) => {
                  dispatch(
                    updateTransaction({
                      id: transactId,
                      field: "category",
                      value: category,
                    }),
                  );
                }}
              />
            </>
          ) : activeTab === "keywords" ? (
            <div className="mt-6">
              <KeywordsTab />
            </div>
          ) : (
            <div className="mt-6">
              <AccruedManager />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
