"use client";

import { useState } from "react";
import Navbar from "../Navbar";
import TransactionsTable from "../transactions/table";
import Papa from "papaparse";

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

  const handleAddTransactions = () => {
    setTransactions((prev) => [...prev, ...pendingTransactions]);
    setPendingTransactions([]); // clear buffer
    setFileName("");
  };

  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <Navbar />

      <main className="pt-20 flex min-h-screen w-full flex-col items-center gap-8">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="pt-4">Transactions</h3>

          {/* CSV Upload */}
          <div className="mt-4 flex items-center gap-4">
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
                {pendingTransactions.length} transactions ready to add
              </p>
            )}
          </div>

          <TransactionsTable transactions={transactions} />
        </div>
      </main>
    </div>
  );
}
