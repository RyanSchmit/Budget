"use client";

import { useState, useMemo } from "react";
import Navbar from "../Navbar";
import CategoryPieChart from "../insights/PieChart";
import SankeyDiagram from "../insights/SankeyDiagram";
import CategoryBudgetManager from "../insights/CategoryBudgetManager";
import NetIncomeChart from "../insights/NetIncomeChart";
import { calendarDate, localIsoDate } from "../summary";
import { useAppSelector } from "../../lib/store/hooks";
import {
  selectTransactions,
  selectTransactionsLoaded,
} from "../../lib/store/selectors";

type FilterMode = "month" | "period";
type PeriodOption = "3M" | "6M" | "1Y" | "YTD" | "ALL";

export default function Home() {
  const [activeView, setActiveView] = useState<
    "sankey" | "pie" | "budget-limits" | "net-income"
  >("pie");

  const transactions = useAppSelector(selectTransactions);
  const loaded = useAppSelector(selectTransactionsLoaded);

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [filterMode, setFilterMode] = useState<FilterMode>("period");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("3M");

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const t of transactions) {
      const year = calendarDate(t.date)?.year;
      if (year !== undefined) years.add(year);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (filterMode === "month") {
      return transactions.filter((t) => {
        const date = calendarDate(t.date);
        return date?.year === selectedYear && date?.month === selectedMonth;
      });
    }

    const now = new Date();
    if (selectedPeriod === "ALL") return transactions;

    let cutoff: Date;
    if (selectedPeriod === "YTD") {
      cutoff = new Date(now.getFullYear(), 0, 1);
    } else if (selectedPeriod === "1Y") {
      cutoff = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate(),
      );
    } else {
      const months = selectedPeriod === "3M" ? 3 : 6;
      cutoff = new Date(
        now.getFullYear(),
        now.getMonth() - months,
        now.getDate(),
      );
    }

    // Compared as calendar days rather than instants, so a transaction dated on
    // the cutoff is kept no matter which side of UTC the viewer sits on.
    const cutoffDay = localIsoDate(cutoff);
    return transactions.filter((t) => {
      const iso = calendarDate(t.date)?.iso;
      return iso !== undefined && iso >= cutoffDay;
    });
  }, [transactions, filterMode, selectedYear, selectedMonth, selectedPeriod]);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const periodOptions: PeriodOption[] = ["3M", "6M", "1Y", "YTD", "ALL"];

  const showFilters = activeView === "pie" || activeView === "sankey";

  const filterControls = showFilters ? (
    <>
      {/* Mode Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-white/20">
        {(["month", "period"] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setFilterMode(mode)}
            className={`px-4 py-2 text-sm font-medium transition capitalize ${
              filterMode === mode
                ? "bg-red-600 text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            {mode === "month" ? "Month" : "Period"}
          </button>
        ))}
      </div>

      {filterMode === "month" ? (
        <>
          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-white/10 text-white px-4 py-2 rounded-lg"
          >
            {(availableYears.length
              ? availableYears
              : [currentDate.getFullYear()]
            ).map((year) => (
              <option key={year} value={year} className="text-black">
                {year}
              </option>
            ))}
          </select>

          {/* Month Dropdown */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-white/10 text-white px-4 py-2 rounded-lg"
          >
            {monthNames.map((month, index) => (
              <option key={index} value={index + 1} className="text-black">
                {month}
              </option>
            ))}
          </select>
        </>
      ) : (
        /* Period Buttons */
        <div className="flex rounded-lg overflow-hidden border border-white/20">
          {periodOptions.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-4 py-2 text-sm font-medium transition ${
                selectedPeriod === p
                  ? "bg-red-600 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {p === "ALL" ? "All time" : p}
            </button>
          ))}
        </div>
      )}
    </>
  ) : null;

  return (
    <div className="min-h-screen bg-black font-sans text-white flex flex-col">
      <Navbar />
      <main className="flex-1 flex w-full flex-col items-center gap-8 bg-black pt-24 pb-8">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* View Toggle Buttons */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setActiveView("sankey")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
                activeView === "sankey"
                  ? "bg-red-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white/70"
              }`}
            >
              Sankey Diagram
            </button>

            <button
              onClick={() => setActiveView("pie")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
                activeView === "pie"
                  ? "bg-red-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white/70"
              }`}
            >
              Pie Chart
            </button>

            <button
              onClick={() => setActiveView("budget-limits")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
                activeView === "budget-limits"
                  ? "bg-red-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white/70"
              }`}
            >
              Budget Limits
            </button>

            <button
              onClick={() => setActiveView("net-income")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
                activeView === "net-income"
                  ? "bg-red-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white/70"
              }`}
            >
              Net Income
            </button>
          </div>

          {/* Filters */}
          {showFilters ? (
            <div className="flex justify-center gap-3 flex-wrap mb-6 items-center">
              {filterControls}
            </div>
          ) : null}

          {/* Conditional Rendering */}
          {!loaded ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-400">Loading transactions...</p>
            </div>
          ) : showFilters && filteredTransactions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-400">
                No transactions found for the selected period.
              </p>
            </div>
          ) : activeView === "budget-limits" ? (
            <CategoryBudgetManager transactions={transactions} />
          ) : activeView === "net-income" ? (
            <NetIncomeChart transactions={transactions} />
          ) : !showFilters && transactions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-400">No transactions found.</p>
            </div>
          ) : activeView === "sankey" ? (
            <SankeyDiagram transactions={filteredTransactions} />
          ) : (
            <CategoryPieChart transactions={filteredTransactions} />
          )}
        </div>
      </main>
    </div>
  );
}
