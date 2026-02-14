"use client";

import MoneyInput from "../MoneyInput";
import { useMemo, useState } from "react";
import { Transaction } from "../types";

interface TransactionsTableProps {
  transactions: Transaction[];
  selectedIds: Set<string>;
  onUpdateTransaction: (
    id: string,
    field: keyof Transaction,
    value: string | number,
  ) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
}

interface SortConfig {
  key: keyof Transaction | null;
  direction: "asc" | "desc";
}

export default function TransactionsTable({
  transactions,
  selectedIds,
  onUpdateTransaction,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
}: TransactionsTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "desc",
  });

  const handleSort = (key: keyof Transaction) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "desc" ? "asc" : "desc" };
      }
      return { key, direction: "desc" };
    });
  };

  const SortArrow = ({
    active,
    direction,
  }: {
    active: boolean;
    direction: "asc" | "desc";
  }) => {
    if (!active) return <span className="ml-1 text-gray-600">⇅</span>;
    return <span className="ml-1">{direction === "desc" ? "▼" : "▲"}</span>;
  };

  const sortedTransactions = useMemo(() => {
    if (!sortConfig.key) return transactions;

    return [...transactions].sort((a, b) => {
      const aVal = a[sortConfig.key!];
      const bVal = b[sortConfig.key!];

      if (sortConfig.key === "date") {
        const aDate = new Date(String(aVal));
        const bDate = new Date(String(bVal));
        return sortConfig.direction === "desc"
          ? bDate.getTime() - aDate.getTime()
          : aDate.getTime() - bDate.getTime();
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "desc" ? bVal - aVal : aVal - bVal;
      }

      return sortConfig.direction === "desc"
        ? String(bVal ?? "").localeCompare(String(aVal ?? ""))
        : String(aVal ?? "").localeCompare(String(bVal ?? ""));
    });
  }, [transactions, sortConfig]);

  return (
    <div className="mt-8">
      <div className="relative max-h-96 overflow-y-auto overflow-x-auto rounded-md border border-gray-800">
        <table className="min-w-full divide-y divide-gray-700 text-sm">
          <thead className="sticky top-0 z-10 bg-gray-900">
            <tr>
              <th className="px-4 py-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (!el) return;

                    const someSelected =
                      transactions.some((t) => selectedIds.has(t.id)) &&
                      !allVisibleSelected;

                    el.indeterminate = someSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="accent-red-600"
                />
              </th>

              <th
                onClick={() => handleSort("date")}
                className="px-4 py-3 text-left cursor-pointer select-none"
              >
                Date{" "}
                <SortArrow
                  active={sortConfig.key === "date"}
                  direction={sortConfig.direction}
                />
              </th>

              <th
                onClick={() => handleSort("description")}
                className="px-4 py-3 text-left cursor-pointer select-none"
              >
                Description{" "}
                <SortArrow
                  active={sortConfig.key === "description"}
                  direction={sortConfig.direction}
                />
              </th>

              <th
                onClick={() => handleSort("category")}
                className="px-4 py-3 text-left cursor-pointer select-none"
              >
                Category{" "}
                <SortArrow
                  active={sortConfig.key === "category"}
                  direction={sortConfig.direction}
                />
              </th>

              <th
                onClick={() => handleSort("amount")}
                className="px-4 py-3 text-left cursor-pointer select-none"
              >
                Amount{" "}
                <SortArrow
                  active={sortConfig.key === "amount"}
                  direction={sortConfig.direction}
                />
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-800 bg-black">
            {sortedTransactions.map((t) => (
              <tr key={t.id} className="hover:bg-white/5">
                {/* Select */}
                <td className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={() => onToggleSelect(t.id)}
                    className="accent-red-600"
                  />
                </td>

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
                    value={t.category ?? ""}
                    onChange={(e) =>
                      onUpdateTransaction(t.id, "category", e.target.value)
                    }
                    className="w-full bg-transparent border border-gray-700 rounded px-2 py-1 text-sm"
                    placeholder="Category"
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

        {transactions.length === 0 && (
          <div className="p-4 text-sm text-gray-400">No transactions.</div>
        )}
      </div>
    </div>
  );
}
