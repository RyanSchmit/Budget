"use client";

import Navbar from "../Navbar";
import { useState } from "react";

export default function Transactions() {
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFileName(f ? f.name : "");
  };

  const transactions = [
    {
      id: 1,
      date: "01/02/25",
      description: "Grocery Store",
      category: "Food",
      amount: 45.67,
    },
    {
      id: 2,
      date: "01/05/25",
      description: "Electric Bill",
      category: "Utilities",
      amount: 120.34,
    },
    {
      id: 3,
      date: "01/10/25",
      description: "Paycheck",
      category: "Income",
      amount: 1500.0,
    },
    {
      id: 4,
      date: "01/12/25",
      description: "Coffee",
      category: "Food",
      amount: 4.5,
    },
  ];

  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <Navbar />

      <main className="pt-20 flex min-h-screen w-full flex-col items-center gap-8 bg-black">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="pt-4">Transactions:</h3>

          <form
            method="post"
            action="/api/upload"
            encType="multipart/form-data"
            className="mt-4 flex items-center gap-4"
          >
            <label
              htmlFor="csvFile"
              className="cursor-pointer rounded-md bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20 flex items-center gap-3"
            >
              <span>{fileName || "Choose CSV"}</span>
            </label>

            <input
              id="csvFile"
              name="file"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700"
            >
              Upload
            </button>
          </form>
          <div className="mt-8">
            <div className="overflow-x-auto rounded-md border border-gray-800">
              <table className="min-w-full divide-y divide-gray-700 text-sm">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-black">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-white/2">
                      <td className="px-4 py-3">{t.date}</td>
                      <td className="px-4 py-3">{t.description}</td>
                      <td className="px-4 py-3">{t.category}</td>
                      <td className="px-4 py-3 text-right">
                        ${t.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
