"use client";

import { Transaction } from "../types";

/** -----------------------
 *  Types
 *  ---------------------- */
export type TransactionFilters = {
  searchQuery: string;
  categoryFilter: string; // "ALL" or category name
  startDate: string; // "" or "YYYY-MM-DD"
  endDate: string; // "" or "YYYY-MM-DD"

  month: number | "ALL";
  year: number | "ALL";
};

type FilterBarProps = {
  transactionsCount: number;
  filteredCount: number;
  categories: string[];
  availableYears: number[];

  filters: TransactionFilters;

  setSearchQuery: (v: string) => void;
  setCategoryFilter: (v: string) => void;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  setMonth: (v: number | "ALL") => void;
  setYear: (v: number | "ALL") => void;

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
  const {
    searchQuery,
    categoryFilter,
    startDate,
    endDate,
    month,
    year,
  } = filters;

  const q = searchQuery.trim().toLowerCase();

  return transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === "ALL" || t.category === categoryFilter;

    const txDate = new Date(t.date);

    const afterStart = startDate ? txDate >= new Date(startDate) : true;
    const beforeEnd = endDate ? txDate <= new Date(endDate) : true;

    const matchesMonth =
      month === "ALL" || txDate.getMonth() + 1 === month;

    const matchesYear =
      year === "ALL" || txDate.getFullYear() === year;

    return (
      matchesSearch &&
      matchesCategory &&
      afterStart &&
      beforeEnd &&
      matchesMonth &&
      matchesYear
    );
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
  availableYears,
  filters,
  setSearchQuery,
  setCategoryFilter,
  setStartDate,
  setEndDate,
  setMonth,
  setYear,
  showDateFilter,
  setShowDateFilter,
}: FilterBarProps) {
  if (transactionsCount === 0) return null;

  const {
    searchQuery,
    categoryFilter,
    startDate,
    endDate,
    month,
    year,
  } = filters;

  const hasFilters = Boolean(
    searchQuery ||
      categoryFilter !== "ALL" ||
      startDate ||
      endDate ||
      month !== "ALL" ||
      year !== "ALL",
  );

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Search */}
      <input
        type="text"
        placeholder="Search description…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-72 rounded-md border border-gray-700 bg-black px-3 py-2 text-sm text-white"
      />

      {/* Category */}
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

      {/* Year */}
      <select
        value={year}
        onChange={(e) =>
          setYear(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
        }
        className="rounded-md border border-gray-700 bg-black px-3 py-2 text-sm"
      >
        <option value="ALL">All Years</option>
        {availableYears.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {/* Month */}
      <select
        value={month}
        onChange={(e) =>
          setMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
        }
        className="rounded-md border border-gray-700 bg-black px-3 py-2 text-sm"
      >
        <option value="ALL">All Months</option>
        {monthNames.map((m, i) => (
          <option key={i} value={i + 1}>
            {m}
          </option>
        ))}
      </select>

      {/* Date Toggle */}
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

      {/* Clear */}
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setCategoryFilter("ALL");
            setStartDate("");
            setEndDate("");
            setMonth("ALL");
            setYear("ALL");
          }}
          className="text-sm text-gray-400 hover:text-white"
        >
          Clear
        </button>
      )}
    </div>
  );
}