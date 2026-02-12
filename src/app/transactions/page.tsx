"use client";

import { useMemo, useState } from "react";
import Navbar from "../Navbar";
import TransactionsTable from "../transactions/table";
import { useCategories } from "./categories";
import { createCsvUploadHandlers } from "./csv";
import { useTransactionFilter } from "./filter";
import { useSaveShortcut } from "./save";
import { rulePredict } from "../transactions/predictions";
import { Transaction } from "../types";

export default function Transactions() {
  // Transaction state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>(
    [],
  );

  // File state
  const [fileName, setFileName] = useState("");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Category state
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // CSV upload handlers
  const { handleFileChange } = useMemo(
    () => createCsvUploadHandlers({ setFileName, setPendingTransactions }),
    [setFileName, setPendingTransactions],
  );

  // Category state
  const { categories, setCategories } = useCategories();

  const uniquePendingTransactions = useMemo(() => {
    const keyFor = (t: Transaction) =>
      `${t.date}__${String(t.description).trim().toLowerCase()}__${t.amount}`;

    const existingKeys = new Set(transactions.map(keyFor));
    const seen = new Set<string>();

    return pendingTransactions.filter((t) => {
      const key = keyFor(t);
      if (existingKeys.has(key)) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [pendingTransactions, transactions]);

  const { filteredTransactions, allVisibleSelected, handleSelectAll } =
    useTransactionFilter({
      transactions,
      searchQuery,
      categoryFilter,
      startDate,
      endDate,
      selectedIds,
      setSelectedIds,
    });

  const { handleSave } = useSaveShortcut(transactions);

  // Add transactions
  const handleAddTransactions = () => {
    setTransactions((prev) => [...prev, ...uniquePendingTransactions]);
    setPendingTransactions([]);
    setFileName("");
  };

  const onUpdateTransaction = (
    id: string,
    field: string,
    value: string | number,
  ) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              [field]: value,
            }
          : t,
      ),
    );
  };

  const handleDeleteSelected = () => {
    setTransactions((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Predict categories
  const handlePredict = () => {
    setTransactions((prev) => {
      const predictedCategories = new Set<string>();

      const next = prev.map((t) => {
        // Don't overwrite manually-set categories
        if (t.category && t.category !== "N/A") return t;

        const predicted = rulePredict(t.description, t.amount);
        predictedCategories.add(predicted);
        return { ...t, category: predicted };
      });

      if (predictedCategories.size > 0) {
        setCategories((cats) => {
          const merged = new Set(cats);
          predictedCategories.forEach((c) => merged.add(c));
          return Array.from(merged);
        });
      }

      return next;
    });
  };

  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <Navbar />

      <main className="pt-20 flex min-h-screen w-full flex-col items-center gap-8">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="pt-4">Transactions</h3>

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
                  {/* disable the button if it does not 
                  differ from the transactions from the database */}
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700"
                  >
                    Save
                  </button>

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
              {(searchQuery || categoryFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("ALL");
                  }}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          <TransactionsTable
            transactions={filteredTransactions}
            selectedIds={selectedIds}
            onUpdateTransaction={onUpdateTransaction}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={handleSelectAll}
            allVisibleSelected={allVisibleSelected}
            categories={categories}
            setCategories={setCategories}
          />
        </div>
      </main>
    </div>
  );
}
