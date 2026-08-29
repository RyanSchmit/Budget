"use client";

import { Transaction } from "../types";
import { calendarDate, isIncome } from "../summary";

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
  // Both split on the "Income" category, the same way the insights charts do.
  expensesOnly: boolean;
  incomeOnly: boolean;
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
  setExpensesOnly: (v: boolean) => void;
  setIncomeOnly: (v: boolean) => void;

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
    expensesOnly,
    incomeOnly,
  } = filters;

  const q = searchQuery.trim().toLowerCase();

  return transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === "ALL" || t.category === categoryFilter;

    // Read the calendar fields off the stored string rather than through Date,
    // which would parse "YYYY-MM-DD" as UTC midnight and push the 1st of a
    // month into the previous month for anyone west of UTC.
    const date = calendarDate(t.date);

    const afterStart = !startDate || (date !== null && date.iso >= startDate);
    const beforeEnd = !endDate || (date !== null && date.iso <= endDate);

    const matchesMonth = month === "ALL" || date?.month === month;

    const matchesYear = year === "ALL" || date?.year === year;

    const matchesExpensesOnly = !expensesOnly || !isIncome(t);
    const matchesIncomeOnly = !incomeOnly || isIncome(t);

    return (
      matchesSearch &&
      matchesCategory &&
      afterStart &&
      beforeEnd &&
      matchesMonth &&
      matchesYear &&
      matchesExpensesOnly &&
      matchesIncomeOnly
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
  setExpensesOnly,
  setIncomeOnly,
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
    expensesOnly,
    incomeOnly,
  } = filters;

  const hasFilters = Boolean(
    searchQuery ||
      categoryFilter !== "ALL" ||
      startDate ||
      endDate ||
      month !== "ALL" ||
      year !== "ALL" ||
      expensesOnly ||
      incomeOnly,
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

      {/* Transaction type toggles — always side by side */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setExpensesOnly(!expensesOnly);
            if (!expensesOnly) setIncomeOnly(false);
          }}
          className={`rounded-md px-4 py-2 text-sm ${
            expensesOnly
              ? "bg-red-700 text-white hover:bg-red-600"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          Expenses Only
        </button>

        <button
          type="button"
          onClick={() => {
            setIncomeOnly(!incomeOnly);
            if (!incomeOnly) setExpensesOnly(false);
          }}
          className={`rounded-md px-4 py-2 text-sm ${
            incomeOnly
              ? "bg-green-700 text-white hover:bg-green-600"
              : "bg-gray-700 hover:bg-gray-600"
          }`}
        >
          Income Only
        </button>
      </div>

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
            setExpensesOnly(false);
            setIncomeOnly(false);
          }}
          className="text-sm text-gray-400 hover:text-white"
        >
          Clear
        </button>
      )}
    </div>
  );
}