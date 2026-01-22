"use client";

import { useState } from "react";
import Navbar from "../Navbar";
import { transactions } from "../transactions";
import CategoryPieChart from "../insights/PieChart";
import SankeyDiagram from "../insights/SankeyDiagram";

export default function Home() {
  const [activeView, setActiveView] = useState<"sankey" | "pie">("sankey");

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
          </div>

          {/* Conditional Rendering */}
          {activeView === "sankey" ? (
            <SankeyDiagram transactions={transactions} />
          ) : (
            <CategoryPieChart transactions={transactions} />
          )}
        </div>
      </main>
    </div>
  );
}
