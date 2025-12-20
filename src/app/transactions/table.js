"use client";

import MoneyInput from "../moneyInput";

export default function TransactionsTable({
  transactions,
  onUpdateTransaction,
}) {
  return (
    <div className="mt-8">
      <div className="relative max-h-96 overflow-y-auto overflow-x-auto rounded-md border border-gray-800">
        <table className="min-w-full divide-y divide-gray-700 text-sm">
          <thead className="sticky top-0 z-10 bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left whitespace-nowrap">Date</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-800 bg-black">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-white/5">
                {/* Date */}
                <td className="px-4 py-2 whitespace-nowrap">
                  <input
                    type="text"
                    value={t.date}
                    onChange={(e) =>
                      onUpdateTransaction(t.id, "date", e.target.value)
                    }
                    className="w-auto min-w-fit bg-transparent border border-gray-700 rounded px-2 py-1 text-sm"
                  />
                </td>

                {/* Description */}
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={t.description}
                    onChange={(e) =>
                      onUpdateTransaction(t.id, "description", e.target.value)
                    }
                    className="w-full bg-transparent border border-gray-700 rounded px-2 py-1 text-sm"
                  />
                </td>

                {/* Category */}
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={t.category}
                    onChange={(e) =>
                      onUpdateTransaction(t.id, "category", e.target.value)
                    }
                    className="w-full bg-transparent border border-gray-700 rounded px-2 py-1 text-sm"
                  />
                </td>

                {/* Amount */}
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <MoneyInput
                    value={t.amount}
                    onChange={(val) =>
                      onUpdateTransaction(t.id, "amount", Number(val))
                    }
                    placeholder="$0.00"
                    className="w-24 bg-transparent border border-gray-700 rounded px-2 py-1 text-sm text-right"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
