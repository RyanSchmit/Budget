"use client";

import React from "react";
import { Transaction } from "../types";

/** -----------------------
 *  Types
 *  ---------------------- */
export type TransactionFilters = {
  searchQuery: string;
  categoryFilter: string; // "ALL" or category name
  startDate: string; // "" or "YYYY-MM-DD"
  endDate: string; // "" or "YYYY-MM-DD"
};

type FilterBarProps = {
  transactionsCount: number; // total transactions (used to decide whether to show)
  filteredCount: number; // shown in "X results"
  categories: string[];

  filters: TransactionFilters;
  setSearchQuery: (v: string) => void;
  setCategoryFilter: (v: string) => void;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;

  showDateFilter: boolean;
  setShowDateFilter: (v: boolean) => void;
};

/** -----------------------
 *  Pure filter logic
 *  ---------------------- */
export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  const { searchQuery, categoryFilter, startDate, endDate } = filters;
  const q = searchQuery.trim().toLowerCase();

  return transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(q);
    const matchesCategory =
      categoryFilter === "ALL" || t.category === categoryFilter;

    const txDate = new Date(t.date);
    const afterStart = startDate ? txDate >= new Date(startDate) : true;
    const beforeEnd = endDate ? txDate <= new Date(endDate) : true;

    return matchesSearch && matchesCategory && afterStart && beforeEnd;
  });
}

export function areAllVisibleSelected(
  visible: Transaction[],
  selectedIds: Set<string>,
): boolean {
  return visible.length > 0 && visible.every((t) => selectedIds.has(t.id));
}

export function toggleSelectAllVisible(
  visible: Transaction[],
  selectedIds: Set<string>,
): Set<string> {
  const next = new Set(selectedIds);
  const allVisibleSelected = areAllVisibleSelected(visible, selectedIds);

  if (allVisibleSelected) {
    visible.forEach((t) => next.delete(t.id));
  } else {
    visible.forEach((t) => next.add(t.id));
  }

  return next;
}

/** -----------------------
 *  FilterBar UI component
 *  ---------------------- */
export function FilterBar({
  transactionsCount,
  filteredCount,
  categories,
  filters,
  setSearchQuery,
  setCategoryFilter,
  setStartDate,
  setEndDate,
  showDateFilter,
  setShowDateFilter,
}: FilterBarProps) {
  if (transactionsCount === 0) return null;

  const { searchQuery, categoryFilter, startDate, endDate } = filters;
  const hasFilters = Boolean(
    searchQuery || categoryFilter !== "ALL" || startDate || endDate,
  );

  return (
    <div className="flex items-center gap-4 mt-4 flex-wrap">
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
        onClick={() => setShowDateFilter(!showDateFilter)}
        className="rounded-md bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
      >
        {showDateFilter ? "Hide Dates" : "Filter by Date"}
      </button>

      {/* Date Range */}
      {showDateFilter && (
        <div className="flex items-center gap-4">
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

      <p className="text-sm text-gray-400">{filteredCount} results</p>

      {/* Clear Filters */}
      {hasFilters && (
        <button
          type="button"
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
  );
}