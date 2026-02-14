"use client";

import Navbar from "../Navbar";
import { useEffect, useMemo, useState } from "react";
import { Transaction } from "../types";
import FileUI from "./csv";
import {
  FilterBar,
  filterTransactions,
  areAllVisibleSelected,
  toggleSelectAllVisible,
} from "./filter";
import TransactionsTable from "./table";

export default function Transactions() {
  // Transaction States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>(
    [],
  );

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);

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

  const getTransactionKey = (t: Transaction) =>
    `${t.date}|${t.description}|${t.amount}`;

  // de-dupe within pending (keeps first occurrence)
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

  // Debug: log updated transactions
  useEffect(() => {
    console.log("transactions updated:", transactions);
  }, [transactions]);

  // Filtering
  const filteredTransactions = useMemo(() => {
    return filterTransactions(transactions, {
      searchQuery,
      categoryFilter,
      startDate,
      endDate,
    });
  }, [transactions, searchQuery, categoryFilter, startDate, endDate]);

  // Select-all on visible rows
  const allVisibleSelected = useMemo(() => {
    return areAllVisibleSelected(filteredTransactions, selectedIds);
  }, [filteredTransactions, selectedIds]);

  const handleSelectAll = () => {
    setSelectedIds((prev) =>
      toggleSelectAllVisible(filteredTransactions, prev),
    );
  };

  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <Navbar />

      <main className="pt-20 flex min-h-screen w-full flex-col items-center gap-8">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <FileUI
            pendingCount={uniquePendingTransactions.length}
            onParsed={setPendingTransactions}
            onAdd={handleAddTransactions}
          />

          <FilterBar
            transactionsCount={transactions.length}
            filteredCount={filteredTransactions.length}
            categories={categories}
            filters={{ searchQuery, categoryFilter, startDate, endDate }}
            setSearchQuery={setSearchQuery}
            setCategoryFilter={setCategoryFilter}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            showDateFilter={showDateFilter}
            setShowDateFilter={setShowDateFilter}
          />

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
                  prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
                );
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
