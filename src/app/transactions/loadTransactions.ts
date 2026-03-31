"use client";

import { fetchTransactions } from "../../lib/api/client";
import { Transaction } from "../types";

export async function loadTransactions(): Promise<Transaction[]> {
  try {
    const rows = await fetchTransactions();

    return rows.map((r) => ({
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
