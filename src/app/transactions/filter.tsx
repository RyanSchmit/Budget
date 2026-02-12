"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo } from "react";
import type { Transaction } from "../types";

type SetState<T> = Dispatch<SetStateAction<T>>;

export function useTransactionFilter(params: {
  transactions: Transaction[];
  searchQuery: string;
  categoryFilter: string;
  startDate: string;
  endDate: string;
  selectedIds: Set<string>;
  setSelectedIds: SetState<Set<string>>;
}) {
  const {
    transactions,
    searchQuery,
    categoryFilter,
    startDate,
    endDate,
    selectedIds,
    setSelectedIds,
  } = params;

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return transactions.filter((t) => {
      // 🔍 Description search
      const matchesSearch = query
        ? String(t.description).toLowerCase().includes(query)
        : true;

      // 🏷️ Category
      const matchesCategory =
        categoryFilter === "ALL" || t.category === categoryFilter;

      // 📅 Date range
      if (!start && !end) return matchesSearch && matchesCategory;

      const txDate = new Date(t.date);
      if (Number.isNaN(txDate.getTime())) return false;

      const afterStart = start ? txDate >= start : true;
      const beforeEnd = end ? txDate <= end : true;

      return matchesSearch && matchesCategory && afterStart && beforeEnd;
    });
  }, [transactions, searchQuery, categoryFilter, startDate, endDate]);

  const allVisibleSelected = useMemo(() => {
    return (
      filteredTransactions.length > 0 &&
      filteredTransactions.every((t) => selectedIds.has(t.id))
    );
  }, [filteredTransactions, selectedIds]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (allVisibleSelected) {
        filteredTransactions.forEach((t) => next.delete(t.id));
      } else {
        filteredTransactions.forEach((t) => next.add(t.id));
      }

      return next;
    });
  }, [allVisibleSelected, filteredTransactions, setSelectedIds]);

  return { filteredTransactions, allVisibleSelected, handleSelectAll };
}