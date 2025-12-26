"use client";

import { useState } from "react";
import Navbar from "../Navbar";
import TransactionsTable from "../transactions/table";
import Papa from "papaparse";
import { useEffect } from "react";
import { rulePredict } from "../transactions/predictions";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [fileName, setFileName] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [categories, setCategories] = useState([
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    handleCSVUpload(file);
  };

  const handleCSVUpload = (file) => {
    if (!(file instanceof File)) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed = data.map((row) => {
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
            id: crypto.randomUUID(),
            date: row.Date || row.date || "",
            description: row.Description || "",
            category: "N/A",
            amount,
          };
        });

        // ❗ Store temporarily
        setPendingTransactions(parsed);
      },
    });
  };

  const handleSave = () => {
    // Implement save logic here
    console.log("Saving transactions:", transactions);
  };

  // ⌨️ Keyboard shortcut: Ctrl+S / Cmd+S to Save
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 🚫 Ignore shortcuts while typing in inputs
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const isSave =
        (isMac && e.metaKey && e.key === "s") ||
        (!isMac && e.ctrlKey && e.key === "s");

      if (isSave) {
        e.preventDefault();
        if (transactions.length > 0) {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [transactions, handleSave]);

  const handlePredict = async () => {
    if (!transactions || transactions.length === 0) return;

    try {
      const preds = await Promise.all(
        transactions.map(async (t) => {
          const res = rulePredict?.(t.description, t.amount);
          return res instanceof Promise ? res : res;
        })
      );

      setTransactions((prev) =>
        prev.map((t, i) => ({
          ...t,
          category: preds[i] ?? t.category ?? "N/A",
        }))
      );
    } catch (err) {
      console.error("Prediction error:", err);
    }
  };

  const getTransactionKey = (t) => `${t.date}|${t.description}|${t.amount}`;

  const uniquePendingTransactions = pendingTransactions.filter(
    (pending) =>
      !transactions.some(
        (existing) => getTransactionKey(existing) === getTransactionKey(pending)
      )
  );

  const handleAddTransactions = () => {
    setTransactions((prev) => [...prev, ...uniquePendingTransactions]);
    setPendingTransactions([]);
    setFileName("");
  };

  const onUpdateTransaction = (id, field, value) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              [field]: value,
            }
          : t
      )
    );
  };

  const handleDeleteSelected = () => {
    setTransactions((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
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
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium
                 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium
                 disabled:opacity-50 disabled:cursor-not-allowed
                 hover:bg-red-700"
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
