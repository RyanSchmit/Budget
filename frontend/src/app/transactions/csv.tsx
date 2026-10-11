"use client";
import Papa from "papaparse";
import { Transaction } from "../types";
import { useState } from "react";

export const normalizeDate = (raw: string): string => {
  if (!raw) return raw;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // MM/DD/YYYY or MM/DD/YY
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, month, day, yearRaw] = slashMatch;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  // Fallback: let the JS Date parser try
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return raw;
};

// Header names vary between banks, so match on a loose key: lowercased with
// all non-alphanumeric characters removed ("Transaction Date" -> "transactiondate").
const looseKey = (header: string): string =>
  header.toLowerCase().replace(/[^a-z0-9]/g, "");

const DATE_KEYS = ["transactiondate", "postingdate", "posteddate", "date"];
const DESCRIPTION_KEYS = ["transactiondescription", "description", "memo", "payee"];
const AMOUNT_KEYS = ["transactionamount", "amount"];
const TYPE_KEYS = ["transactiontype", "type"];

const pick = (row: Record<string, string>, keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
};

const parseAmount = (raw: string): { numeric: number; negative: boolean } => {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const negative = cleaned.includes("-") || /^\(.*\)$/.test(cleaned);
  const numeric = Math.abs(Number(cleaned.replace(/[()-]/g, "")) || 0);
  return { numeric, negative };
};

const toTransaction = (row: Record<string, string>): Transaction => {
  const debitRaw = pick(row, ["debit"]);
  const creditRaw = pick(row, ["credit"]);
  const amountRaw = pick(row, AMOUNT_KEYS);
  const type = pick(row, TYPE_KEYS).toLowerCase();

  let amount = 0;
  if (debitRaw) {
    amount = -parseAmount(debitRaw).numeric;
  } else if (creditRaw) {
    amount = parseAmount(creditRaw).numeric;
  } else {
    // Single amount column. A separate type column ("Debit"/"Credit",
    // "Withdrawal"/"Deposit") wins over the sign, since such files list
    // every amount as a positive magnitude.
    const { numeric, negative } = parseAmount(amountRaw);
    if (type.startsWith("debit") || type.startsWith("withdrawal")) {
      amount = -numeric;
    } else if (type.startsWith("credit") || type.startsWith("deposit")) {
      amount = numeric;
    } else {
      amount = negative ? -numeric : numeric;
    }
  }

  return {
    id: crypto.randomUUID(),
    date: normalizeDate(pick(row, DATE_KEYS)),
    description: pick(row, DESCRIPTION_KEYS),
    category: "N/A",
    amount,
  };
};

const handleCSVUpload = (
  file: File,
  onComplete: (transactions: Transaction[]) => void,
): void => {
  if (!(file instanceof File)) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    transformHeader: looseKey,
    complete: ({ data }) => {
      const parsed = (data as Record<string, string>[])
        .map(toTransaction)
        .filter((t) => t.date || t.description || t.amount);

      onComplete(parsed);
    },
  });
};

type FileUIProps = {
  pendingCount: number;
  onParsed: (transactions: Transaction[]) => void;
  onAdd: () => void;
};

export default function FileUI({ pendingCount, onParsed, onAdd }: FileUIProps) {
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    handleCSVUpload(file, onParsed);
  };

  const handleAddClick = () => {
    onAdd();
    setFileName("");
  };

  return (
    <div className="flex items-center gap-6">
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
              disabled={pendingCount === 0}
              onClick={handleAddClick}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>

            {pendingCount > 0 && (
              <p className="text-sm text-gray-400">{pendingCount} ready</p>
            )}
    </div>
  );
}
