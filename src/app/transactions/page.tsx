"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "../Navbar";
import TransactionsTable from "../transactions/table";
import Papa from "papaparse";
import { predictCategory } from "../transactions/predictions";
import { Transaction } from "../types";
import { TransactionStore } from "./TransactionStore";
import {
  fetchTransactions,
  insertTransactions,
  updateTransaction,
  deleteTransactions,
  predictCategoriesWithTFIDF,
} from "./actions";
import KeywordsTab from "./KeywordsTab";
import SelectionKeywordToolbar from "./SelectionKeywordToolbar";

// Single store instance (observer subject) for transaction state
const transactionStore = TransactionStore.getInstance();

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>(
    []
  );
  const [fileName, setFileName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"transactions" | "keywords">(
    "transactions"
  );
  const [showAI, setShowAI] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const storeRef = useRef(transactionStore);
  const store = storeRef.current;
  const transactionsTabRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<string[]>([
    "Restaurants",
    "College",
    "Income",
    "Trips",
    "Utilities",
    "Energy Drink",
    "Groceries",
    "Bars",
    "Golf",
    "Transportation",
    "Alcohol",
    "Snacks",
    "Subscriptions",
    "Sports Games",
    "Traffic Tickets",
    "Gym",
    "Gambling",
    "Clothes",
    "Online Shopping",
    "Books",
    "N/A",
  ]);

  // Subscribe to store (observer): any change notifies and we sync state for re-render
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setTransactions(store.getTransactions());
    });
    return unsubscribe;
  }, [store]);

  // Load transactions from database on mount
  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true);
        const data = await fetchTransactions();
        store.setTransactions(data);
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setLoading(false);
      }
    }
    loadTransactions();
  }, [store]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    handleCSVUpload(file);
  };

  const handleCSVUpload = (file: File) => {
    if (!(file instanceof File)) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed: Transaction[] = (data as any[]).map((row) => {
          const debitRaw = row.Debit ?? row.debit ?? "";
          const creditRaw = row.Credit ?? row.credit ?? "";
          const fallbackRaw = row.Amount ?? row.amount ?? "";
          const raw = debitRaw || creditRaw || fallbackRaw || "0";

          // remove currency characters and commas, keep digits, dot and parentheses for negative
          const cleaned = String(raw).replace(/[$,]/g, "").trim();
          // remove parentheses for parsing but remember if they existed (accounting-style negative)
          const hasParens = cleaned.includes("(") && cleaned.includes(")");
          const numeric = Number(cleaned.replace(/[()]/g, "") || 0);

          let amount = numeric;
          if (debitRaw) {
            amount = -Math.abs(numeric);
          } else if (creditRaw) {
            amount = Math.abs(numeric);
          } else if (hasParens || String(raw).includes("-")) {
            amount = -Math.abs(numeric);
          } else {
            amount = Math.abs(numeric);
          }

          return {
            id: "new-" + crypto.randomUUID(),
            date: row.Date || row.date || "",
            description: row.Description || row.description || "",
            category: "N/A",
            amount,
          };
        });

        // ❗ Store temporarily
        setPendingTransactions(parsed);
      },
    });
  };

  async function handleSave() {
    const toInsert = store.getNewTransactions();
    const toUpdate = store.getDirtyTransactions();
    if (toInsert.length === 0 && toUpdate.length === 0) {
      return;
    }

    try {
      setSaving(true);
      if (toInsert.length > 0) {
        const result = await insertTransactions(toInsert);
        if (!result.success) {
          alert(`Failed to save new transactions: ${result.error}`);
          return;
        }
      }
      if (toUpdate.length > 0) {
        const results = await Promise.all(
          toUpdate.map((t) =>
            updateTransaction(t.id, {
              date: t.date,
              description: t.description,
              category: t.category,
              amount: t.amount,
            })
          )
        );
        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) {
          console.error("Some updates failed:", failed.length);
        }
      }
      const data = await fetchTransactions();
      store.setTransactionsAndOriginal(data);
      alert("Transactions saved to database successfully!");
    } catch (error) {
      console.error("Error saving transactions:", error);
      alert("Failed to save transactions. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ⌨️ Keyboard shortcut: Ctrl+S / Cmd+S to Save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const isSave =
        (isMac && e.metaKey && e.key === "s") ||
        (!isMac && e.ctrlKey && e.key === "s");

      if (isSave) {
        e.preventDefault();
        if (store.hasChangesToSave() && !saving) handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [store, saving]);

  const handlePredict = async () => {
    const current = store.getTransactions();
    if (!current || current.length === 0) return;

    try {
      const preds = current.map((t) => predictCategory(t));
      let updated = current.map((t, i) => ({
        ...t,
        category: preds[i] ?? t.category ?? "N/A",
      }));
      updated = await predictCategoriesWithTFIDF(updated);
      store.setTransactionsSlice(updated);
      setShowAI(true);
    } catch (err) {
      console.error("Prediction error:", err);
    }
  };

  const getTransactionKey = (t: Transaction) =>
    `${t.date}|${t.description}|${t.amount}`;

  const uniquePendingTransactions = pendingTransactions.filter(
    (pending) =>
      !transactions.some(
        (existing) => getTransactionKey(existing) === getTransactionKey(pending)
      )
  );

  const handleAddTransactions = async () => {
    if (uniquePendingTransactions.length === 0) {
      setPendingTransactions([]);
      setFileName("");
      return;
    }

    try {
      const result = await insertTransactions(uniquePendingTransactions);
      if (result.success) {
        const data = await fetchTransactions();
        store.setTransactionsAndOriginal(data);
        setPendingTransactions([]);
        setFileName("");
      } else {
        console.error("Failed to save new transactions:", result.error);
        store.addPending(uniquePendingTransactions);
        setPendingTransactions([]);
        setFileName("");
      }
    } catch (error) {
      console.error("Error saving new transactions:", error);
      store.addPending(uniquePendingTransactions);
      setPendingTransactions([]);
      setFileName("");
    }
  };

  const onUpdateTransaction = (
    id: string,
    field: string,
    value: string | number
  ) => {
    store.updateTransaction(id, field as keyof Transaction, value);
    // Persistence happens on Save (user clicks Save to update DB)
  };

  const handleDeleteSelected = async () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    store.removeByIds(selectedIds);
    setSelectedIds(new Set());

    try {
      const result = await deleteTransactions(idsToDelete);
      if (!result.success) {
        console.error("Failed to delete transactions:", result.error);
        const data = await fetchTransactions();
        store.setTransactionsAndOriginal(data);
      }
    } catch (error) {
      console.error("Error deleting transactions:", error);
      const data = await fetchTransactions();
      store.setTransactionsAndOriginal(data);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredTransactions = transactions.filter((t) => {
    // 🔍 Description search
    const matchesSearch = t.description
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());

    // 🏷️ Category
    const matchesCategory =
      categoryFilter === "ALL" || t.category === categoryFilter;

    // 📅 Date range
    const txDate = new Date(t.date);
    const afterStart = startDate ? txDate >= new Date(startDate) : true;
    const beforeEnd = endDate ? txDate <= new Date(endDate) : true;

    return matchesSearch && matchesCategory && afterStart && beforeEnd;
  });

  const allVisibleSelected =
    filteredTransactions.length > 0 &&
    filteredTransactions.every((t) => selectedIds.has(t.id));

  const handleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (allVisibleSelected) {
        filteredTransactions.forEach((t) => next.delete(t.id));
      } else {
        filteredTransactions.forEach((t) => next.add(t.id));
      }

      return next;
    });
  };

  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <Navbar />

      <main className="pt-20 flex min-h-screen w-full flex-col items-center gap-8">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-4 flex items-center gap-6 border-b border-gray-800 pb-2">
            <nav className="flex gap-1">
              <button
                type="button"
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

          {activeTab === "keywords" ? (
            <KeywordsTab />
          ) : (
            <div ref={transactionsTabRef}>
              {activeTab === "transactions" && (
                <SelectionKeywordToolbar containerRef={transactionsTabRef} />
              )}
              {loading && (
                <p className="text-sm text-gray-400 mt-2">
                  Loading transactions...
                </p>
              )}

              {/* CSV Upload */}
              <div className="mt-4 flex items-center gap-4">
                <div className="mt-4 flex items-center justify-between gap-12 w-full">
                  {/* LEFT: CSV + Add */}
                  <div className="flex items-center gap-6">
                    <label
                      htmlFor="csvFile"
                      className="cursor-pointer rounded-md bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
                    >
                      {fileName || "Choose CSV"}
                    </label>

                    <input
                      id="csvFile"
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <button
                      type="button"
                      disabled={pendingTransactions.length === 0}
                      onClick={handleAddTransactions}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>

                    {pendingTransactions.length > 0 && (
                      <p className="text-sm text-gray-400">
                        {pendingTransactions.length} ready
                      </p>
                    )}
                  </div>

                  {/* RIGHT: Delete, Save, + Predict */}
                  {transactions.length > 0 && (
                    <div className="flex items-center gap-6">
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving || !store.hasChangesToSave()}
                          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        {store.hasChangesToSave() && !saving && (
                          <span className="text-amber-400 text-sm">
                            {store.getNewTransactions().length > 0 &&
                              `${store.getNewTransactions().length} new`}
                            {store.getNewTransactions().length > 0 &&
                              store.getDirtyTransactions().length > 0 &&
                              ", "}
                            {store.getDirtyTransactions().length > 0 &&
                              `${store.getDirtyTransactions().length} modified`}
                          </span>
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={handlePredict}
                        className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium hover:bg-purple-700"
                      >
                        Predict
                      </button>
                      <button
                        type="button"
                        disabled={selectedIds.size === 0}
                        onClick={handleDeleteSelected}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Search + Category filter */}
              {transactions.length > 0 && (
                <div className="flex items-center gap-4 mt-4">
                  {/* Search */}
                  <input
                    type="text"
                    placeholder="Search description…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-72 rounded-md border border-gray-700 bg-black px-3 py-2 text-sm text-white"
                  />

                  {/* Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="rounded-md border border-gray-700 bg-black px-3 py-2 text-sm"
                  >
                    <option value="ALL">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  {/* Date Filter Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowDateFilter((p) => !p)}
                    className="rounded-md bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
                  >
                    {showDateFilter ? "Hide Dates" : "Filter by Date"}
                  </button>

                  {showDateFilter && (
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-400">From</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="rounded-md border border-gray-700 bg-black px-2 py-1 text-sm"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-400">To</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="rounded-md border border-gray-700 bg-black px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-gray-400">
                    {filteredTransactions.length} results
                  </p>

                  {/* Clear Filters */}
                  {(searchQuery ||
                    categoryFilter !== "ALL" ||
                    startDate ||
                    endDate) && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setCategoryFilter("ALL");
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              <div className="mb-8">
                <TransactionsTable
                  transactions={filteredTransactions}
                  selectedIds={selectedIds}
                  onUpdateTransaction={onUpdateTransaction}
                  onToggleSelect={toggleSelect}
                  onToggleSelectAll={handleSelectAll}
                  allVisibleSelected={allVisibleSelected}
                  categories={categories}
                  setCategories={setCategories}
                  isDirty={(id) => store.isDirty(id)}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
