"use client";

import Papa from "papaparse";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { Transaction } from "../types";

type SetState<T> = Dispatch<SetStateAction<T>>;

export function createCsvUploadHandlers(params: {
  setFileName: SetState<string>;
  setPendingTransactions: SetState<Transaction[]>;
}) {
  const { setFileName, setPendingTransactions } = params;

  const handleCSVUpload = (file: File) => {
    if (!(file instanceof File)) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed: Transaction[] = (data as any[]).map((row) => {
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
            description: row.Description || row.description || "",
            category: "N/A",
            amount,
          };
        });

        // Store temporarily
        setPendingTransactions(parsed);
      },
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    handleCSVUpload(file);
  };

  return { handleFileChange, handleCSVUpload };
}
