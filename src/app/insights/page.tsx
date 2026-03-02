"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "../Navbar";
import CategoryPieChart from "../insights/PieChart";
import SankeyDiagram from "../insights/SankeyDiagram";
import CategoryStatsTable from "../insights/CategoryStatsTable";
import { loadTransactions } from "../transactions/loadTransactions";
import { Transaction } from "../types";

export default function Home() {
  const [activeView, setActiveView] = useState<
    "sankey" | "pie" | "category-stats"
  >("pie");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(
    currentDate.getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1
  );

  // Load transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      const data = await loadTransactions();
      setTransactions(data);
      setLoading(false);
    };

    fetchTransactions();
  }, []);

  // Extract unique years from transactions
  const availableYears = useMemo(() => {
    const years = new Set(
      transactions.map((t) => new Date(t.date).getFullYear())
    );
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Filter transactions by selected month/year
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const date = new Date(t.date);
      return (
        date.getFullYear() === selectedYear &&
        date.getMonth() + 1 === selectedMonth
      );
    });
  }, [transactions, selectedYear, selectedMonth]);

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const showMonthYearFilters = activeView === "pie" || activeView === "sankey";

  const monthYearFilters = showMonthYearFilters ? (
    <>
      {/* Year Dropdown */}
      <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(Number(e.target.value))}
        className="bg-white/10 text-white px-4 py-2 rounded-lg"
      >
        {(availableYears.length ? availableYears : [currentDate.getFullYear()]).map(
          (year) => (
            <option key={year} value={year} className="text-black">
              {year}
            </option>
          )
        )}
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
              onClick={() => setActiveView("category-stats")}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
                activeView === "category-stats"
                  ? "bg-red-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white/70"
              }`}
            >
              Category Stats
            </button>
          </div>

          {/* Month/Year Filters (always visible for relevant views) */}
          {showMonthYearFilters ? (
            <div className="flex justify-center gap-3 flex-wrap mb-6">
              {monthYearFilters}
            </div>
          ) : null}

          {/* Conditional Rendering */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-400">Loading transactions...</p>
            </div>
          ) : showMonthYearFilters && filteredTransactions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-400">
                No transactions found for selected month.
              </p>
            </div>
          ) : !showMonthYearFilters && transactions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-400">No transactions found.</p>
            </div>
          ) : activeView === "sankey" ? (
            <SankeyDiagram transactions={filteredTransactions} />
          ) : activeView === "category-stats" ? (
            <CategoryStatsTable transactions={transactions} />
          ) : (
            <CategoryPieChart transactions={filteredTransactions} />
          )}
        </div>
      </main>
    </div>
  );
}