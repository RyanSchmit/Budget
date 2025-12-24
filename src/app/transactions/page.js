"use client";

import { useState } from "react";
import Navbar from "../Navbar";
import TransactionsTable from "../transactions/table";
import Papa from "papaparse";
import { useEffect } from "react";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [fileName, setFileName] = useState("");

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

  const handlePredict = () => {
    // Implement predict logic here
    console.log("Predicting categories for transactions:", transactions);
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

  const updateTransaction = (id, field, value) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const deleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
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

              {/* RIGHT: Save + Predict */}
              {transactions.length > 0 && (
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-700"
                    onClick={handleSave}
                  >
                    Save <span className="ml-2 text-xs opacity-70">⌘S</span>
                  </button>

                  <button
                    type="button"
                    className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium hover:bg-purple-700"
                    onClick={handlePredict}
                  >
                    Predict
                  </button>
                </div>
              )}
            </div>
          </div>

          <TransactionsTable
            transactions={transactions}
            onUpdateTransaction={updateTransaction}
            onDeleteTransaction={deleteTransaction}
          />
        </div>
      </main>
    </div>
  );
}
