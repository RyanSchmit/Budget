"use client";

import { fetchTransactions } from "../../lib/api/client";
import { Transaction } from "../types";

const PAGE_SIZE = 1000;

export async function loadTransactions(): Promise<Transaction[]> {
  try {
    const first = await fetchTransactions(0, PAGE_SIZE);
    const totalPages = Math.ceil(first.count / PAGE_SIZE);

    const rest =
      totalPages > 1
        ? await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              fetchTransactions(i + 1, PAGE_SIZE).then((r) => r.data),
            ),
          )
        : [];

    const allRows = [...first.data, ...rest.flat()];

    return allRows.map((r) => ({
      id: r.transact_id,
      date: r.date,
      description: r.description,
      category: r.category,
      amount: Number(r.amount),
    }));
  } catch (err) {
    console.error("Failed to load transactions:", err);
    return [];
  }
}
