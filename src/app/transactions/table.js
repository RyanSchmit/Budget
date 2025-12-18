"use client";

import { formatMoney } from "../format";

export default function TransactionsTable({ transactions }) {
  if (transactions.length === 0) {
    return (
      <p className="mt-6 text-sm text-gray-400">
        No transactions yet. Upload a CSV to get started.
      </p>
    );
  }

  return (
    <div className="mt-8">
      <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 max-h-96 + overflow-y-auto scrollbar-track-gray-900">
        <table className="min-w-full divide-y divide-gray-700 text-sm">
          <thead className="bg-gray-900 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-800 bg-black">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-white/5">
                <td className="px-4 py-3">{t.date}</td>
                <td className="px-4 py-3">{t.description}</td>
                <td className="px-4 py-3">{t.category}</td>
                <td className="px-4 py-3 text-right">
                  {formatMoney(t.amount.toFixed(2))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
