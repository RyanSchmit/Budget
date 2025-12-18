"use client";

import { useState } from "react";
import Navbar from "../Navbar";
import TransactionsTable from "../transactions/table";
import Papa from "papaparse";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    parseCSV(file);
  };

  const parseCSV = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed = data.map((row) => ({
          id: crypto.randomUUID(),
          date: row.Date || row.date || "",
          description: row.Description || "",
          category: "N/A",
          amount: Number(
            String(row.Debit || row.debit || "0").replace(/[$,]/g, "")
          ),
        }));

        // Replace or append — your choice
        setTransactions(parsed);
      },
    });
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
          </div>

          <TransactionsTable transactions={transactions} />
        </div>
      </main>
    </div>
  );
}