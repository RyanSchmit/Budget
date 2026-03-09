"use client";

import Navbar from "../Navbar";
import { useCallback, useMemo, useRef, useState } from "react";
import { Transaction } from "../types";
import FileUI from "./csv";
import LoadTransactionsClient from "./LoadTransactionsClient";
import {
  FilterBar,
  filterTransactions,
  areAllVisibleSelected,
  toggleSelectAllVisible,
} from "./filter";
import TransactionsTable from "./table";
import KeywordsTab from "./keywords/KeywordsTab";
import SelectionKeywordToolbar from "./keywords/SelectionKeywordToolbar";
import SaveButton from "./save";
import { defaultCategories } from "./categories";
import DeleteSelectedButton from "./delete";
import { loadTransactions } from "./loadTransactions";
import { getKeywordRules } from "./keywords/keywordRulesStore";
import { rulePredict } from "./keywords/keywordSearch";
import { buildTfidfModel } from "./tfidfModel";

function fingerprintTransaction(t: Transaction) {
  return `${t.date}|${t.description}|${t.category ?? "N/A"}|${Number(t.amount)}`;
}

export default function Transactions() {
  const selectionContainerRef = useRef<HTMLDivElement>(null);

  // Transaction States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>(
    [],
  );
  const [baselineById, setBaselineById] = useState<Record<string, string>>({});

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [month, setMonth] = useState<number | "ALL">("ALL");
  const [year, setYear] = useState<number | "ALL">("ALL");
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const t of transactions) {
      years.add(new Date(t.date).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);
  const filteredTransactions = useMemo(() => {
    return filterTransactions(transactions, {
      searchQuery,
      categoryFilter,
      startDate,
      endDate,
      month,
      year,
    });
  }, [
    transactions,
    searchQuery,
    categoryFilter,
    startDate,
    endDate,
    month,
    year,
  ]);

  // Categories for the filter dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      const c = (t.category ?? "").trim();
      if (c) set.add(c);
    }
    // keep ALL option separate; FilterBar adds it
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Keyword States
  const [activeTab, setActiveTab] = useState<"transactions" | "keywords">(
    "transactions",
  );

  // Categories state for updates
  const [categoriesList, setCategoriesList] =
    useState<string[]>(defaultCategories);

  const getTransactionKey = (t: Transaction) =>
    `${t.date}|${t.description}|${t.amount}`;

  const applyFreshBaseline = useCallback((txs: Transaction[]) => {
    const next: Record<string, string> = {};
    for (const t of txs) {
      next[t.id] = fingerprintTransaction(t);
    }
    setBaselineById(next);
  }, []);

  const reloadFromDb = useCallback(async () => {
    const fresh = await loadTransactions();
    setTransactions(fresh);
    setSelectedIds(new Set());
    applyFreshBaseline(fresh);
  }, [applyFreshBaseline]);

  const { dirtyIds, dirtyTransactions } = useMemo(() => {
    const ids = new Set<string>();
    const dirty: Transaction[] = [];

    for (const t of transactions) {
      const baselineFp = baselineById[t.id];
      const currentFp = fingerprintTransaction(t);
      if (!baselineFp || baselineFp !== currentFp) {
        ids.add(t.id);
        dirty.push(t);
      }
    }

    return { dirtyIds: ids, dirtyTransactions: dirty };
  }, [transactions, baselineById]);

  // get rid of duplicates within pending (keeps first occurrence)
  const uniquePendingTransactions = useMemo(() => {
    const seen = new Set<string>();
    return pendingTransactions.filter((t) => {
      const key = getTransactionKey(t);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [pendingTransactions]);

  const handleAddTransactions = () => {
    if (uniquePendingTransactions.length === 0) {
      setPendingTransactions([]);
      return;
    }

    // Prevent adding duplicates against existing transactions:
    const existingKeys = new Set(transactions.map(getTransactionKey));
    const toAdd = uniquePendingTransactions.filter(
      (t) => !existingKeys.has(getTransactionKey(t)),
    );

    setTransactions((prev) => [...prev, ...toAdd]);
    setPendingTransactions([]);
  };

  // Select-all on visible rows
  const allVisibleSelected = useMemo(() => {
    return areAllVisibleSelected(filteredTransactions, selectedIds);
  }, [filteredTransactions, selectedIds, transactions]);

  const handleSelectAll = () => {
    setSelectedIds((prev) =>
      toggleSelectAllVisible(filteredTransactions, prev),
    );
  };

  const handlePredict = useCallback(async () => {
    const targetIds =
      selectedIds.size > 0
        ? new Set(selectedIds)
        : new Set(filteredTransactions.map((t) => t.id));

    if (targetIds.size === 0) return;

    const rules = getKeywordRules();
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
    setTransactions(afterKeyword);

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

    setTransactions((prev) =>
      prev.map((t) => {
        const p = byId.get(t.id);
        if (!p) return t;

        const current = (t.category ?? "").trim();
        if (current && current !== "N/A") return t; // don't overwrite manual edits

        if (!p.category || p.category === "N/A") return t;
        return { ...t, category: p.category };
      }),
    );
  }, [filteredTransactions, selectedIds, transactions]);

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
                onClick={() => setActiveTab("transactions")}
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
                onClick={() => setActiveTab("keywords")}
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
                  onParsed={setPendingTransactions}
                  onAdd={handleAddTransactions}
                />

                <LoadTransactionsClient
                  onLoaded={(txs: Transaction[]) => {
                    setTransactions(txs);
                    setSelectedIds(new Set());
                    applyFreshBaseline(txs);
                  }}
                />

                {/* Filter Bar + Save Button Row */}
                <div className="mt-4 flex items-start justify-between gap-4">
                  <FilterBar
                    transactionsCount={transactions.length}
                    filteredCount={filteredTransactions.length}
                    categories={categories}
                    availableYears={availableYears}
                    filters={{
                      searchQuery,
                      categoryFilter,
                      startDate,
                      endDate,
                      month,
                      year,
                    }}
                    setSearchQuery={setSearchQuery}
                    setCategoryFilter={setCategoryFilter}
                    setStartDate={setStartDate}
                    setEndDate={setEndDate}
                    setMonth={setMonth}
                    setYear={setYear}
                    showDateFilter={showDateFilter}
                    setShowDateFilter={setShowDateFilter}
                  />

                  {/* Only show Save button if there are transactions */}
                  {transactions.length > 0 && (
                    <div className="flex-shrink-0 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePredict}
                        disabled={
                          (selectedIds.size === 0 &&
                            filteredTransactions.length === 0) ||
                          transactions.length === 0
                        }
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={
                          selectedIds.size > 0
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
                          setBaselineById((prev) => {
                            const next = { ...prev };
                            for (const t of saved) {
                              next[t.id] = fingerprintTransaction(t);
                            }
                            return next;
                          });
                        }}
                      />

                      <DeleteSelectedButton
                        selectedIds={selectedIds}
                        setSelectedIds={setSelectedIds}
                        setTransactions={setTransactions}
                        reloadFromDb={reloadFromDb}
                      />
                    </div>
                  )}
                </div>

                <div className="mb-8 mt-8">
                  <TransactionsTable
                    transactions={filteredTransactions}
                    selectedIds={selectedIds}
                    onToggleSelect={(id) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        next.has(id) ? next.delete(id) : next.add(id);
                        return next;
                      });
                    }}
                    onToggleSelectAll={handleSelectAll}
                    allVisibleSelected={allVisibleSelected}
                    onUpdateTransaction={(id, field, value) => {
                      setTransactions((prev) =>
                        prev.map((t) =>
                          t.id === id ? { ...t, [field]: value } : t,
                        ),
                      );
                    }}
                    categories={[
                      ...new Set([...categories, ...categoriesList]),
                    ].sort()}
                    setCategories={setCategoriesList}
                    isDirty={(id) => dirtyIds.has(id)}
                  />
                </div>
              </div>

              <SelectionKeywordToolbar
                containerRef={selectionContainerRef}
                onSetTransactionCategory={(transactId, category) => {
                  setTransactions((prev) =>
                    prev.map((t) =>
                      t.id === transactId ? { ...t, category } : t,
                    ),
                  );
                }}
              />
            </>
          ) : (
            // Render Keywords tab
            <div className="mt-6">
              <KeywordsTab />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
