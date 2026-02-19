"use client";

import { useState, useEffect } from "react";
import Navbar from "../Navbar";
import CategoryPieChart from "../insights/PieChart";
import SankeyDiagram from "../insights/SankeyDiagram";
import CategoryStatsTable from "../insights/CategoryStatsTable";
import { fetchTransactions } from "../transactions/actions";
import { Transaction } from "../types";

export default function Home() {
  const [activeView, setActiveView] = useState<
    "sankey" | "pie" | "category-stats"
  >("pie");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Load transactions from database on mount
  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true);
        const data = await fetchTransactions();
        setTransactions(data);
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setLoading(false);
      }
    }
    loadTransactions();
  }, []);

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

          {/* Conditional Rendering */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-400">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-400">No transactions found.</p>
            </div>
          ) : activeView === "sankey" ? (
            <SankeyDiagram transactions={transactions} />
          ) : activeView === "category-stats" ? (
            <CategoryStatsTable transactions={transactions} />
          ) : (
            <CategoryPieChart transactions={transactions} />
          )}
        </div>
      </main>
    </div>
  );
}
