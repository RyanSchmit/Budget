"use client";

import Navbar from "../Navbar";
import { useCallback, useRef } from "react";
import { Transaction } from "../types";
import FileUI from "./csv";
import LoadTransactionsClient from "./LoadTransactionsClient";
import { FilterBar } from "./filter";
import TransactionsTable from "./table";
import KeywordsTab from "./keywords/KeywordsTab";
import SelectionKeywordToolbar from "./keywords/SelectionKeywordToolbar";
import SaveButton from "./save";
import DeleteSelectedButton from "./delete";
import { loadTransactions } from "./loadTransactions";
import { rulePredict } from "./keywords/keywordSearch";
import { buildTfidfModel } from "./tfidfModel";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
  loadTransactionsSuccess,
  setPendingTransactions,
  addPendingToTransactions,
  updateTransaction,
  updateBaselineForSaved,
  setTransactions,
} from "../../lib/store/transactionsSlice";
import {
  setSearchQuery,
  setCategoryFilter,
  setStartDate,
  setEndDate,
  setShowDateFilter,
  setMonth,
  setYear,
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

  const reloadFromDb = useCallback(async () => {
    const fresh = await loadTransactions();
    dispatch(loadTransactionsSuccess(fresh));
  }, [dispatch]);

  const handlePredict = useCallback(async () => {
    const targetIds =
      selectedIds.length > 0
        ? new Set(selectedIds)
        : new Set(filteredTransactions.map((t) => t.id));

    if (targetIds.size === 0) return;

    const rules = keywordRules;
    const TFIDF_MIN_SCORE = 0.22;

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

    // Pass 2 (client, multi-thread): TF-IDF for anything still N/A after keywords
    const model = buildTfidfModel(
      afterKeyword.map((t) => ({
        description: t.description,
        category: (t.category ?? "").trim(),
      })),
    );
    if (!model) return;

    const remaining = afterKeyword
      .filter((t) => targetIds.has(t.id))
      .filter((t) => {
        const c = (t.category ?? "").trim();
        return !c || c === "N/A";
      })
      .map((t) => ({ transact_id: t.id, description: t.description }));

    if (remaining.length === 0) return;

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

            w.postMessage({ model, items, minScore: TFIDF_MIN_SCORE });
          }),
      ),
    );

    const byId = new Map(
      results.flat().map((p) => [p.transact_id, p] as const),
    );
    if (byId.size === 0) return;

    const withTfidf = afterKeyword.map((t) => {
      const p = byId.get(t.id);
      if (!p) return t;
      const current = (t.category ?? "").trim();
      if (current && current !== "N/A") return t;
      if (!p.category || p.category === "N/A") return t;
      return { ...t, category: p.category };
    });
    dispatch(setTransactions(withTfidf));
  }, [filteredTransactions, selectedIds, transactions, keywordRules, dispatch]);

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
            </nav>
          </div>

          {activeTab === "transactions" ? (
            <>
              <div ref={selectionContainerRef}>
                <FileUI
                  pendingCount={uniquePendingTransactions.length}
                  onParsed={(txs) => dispatch(setPendingTransactions(txs))}
                  onAdd={() => dispatch(addPendingToTransactions())}
                />

                <LoadTransactionsClient
                  onLoaded={(txs: Transaction[]) => {
                    dispatch(loadTransactionsSuccess(txs));
                  }}
                />

                {/* Filter Bar + Save Button Row */}
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
                            ? "Predict categories for selected rows (keywords, then TF-IDF)"
                            : "Predict categories for all visible rows (keywords, then TF-IDF)"
                        }
                      >
                        Predict
                      </button>

                      <SaveButton
                        transactions={dirtyTransactions}
                        onSaved={(saved) => {
                          if (!saved.length) return;
                          dispatch(updateBaselineForSaved(saved));
                        }}
                      />

                      <DeleteSelectedButton reloadFromDb={reloadFromDb} />
                    </div>
                  )}
                </div>

                <div className="mb-8 mt-8">
                  <TransactionsTable />
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
          ) : (
            <div className="mt-6">
              <KeywordsTab />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
