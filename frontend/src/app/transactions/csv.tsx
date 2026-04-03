"use client";
import Papa from "papaparse";
import { Transaction } from "../types";
import { useState } from "react";

const normalizeDate = (raw: string): string => {
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

const handleCSVUpload = (
  file: File,
  onComplete: (transactions: Transaction[]) => void,
): void => {
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

        const cleaned = String(raw).replace(/[$,]/g, "").trim();
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
          date: normalizeDate(row.Date || row.date || ""),
          description: row.Description || row.description || "",
          category: "N/A",
          amount,
        };
      });

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
    <div>
      <div className="mt-4 flex items-center gap-4">
        <div className="mt-4 flex items-center justify-between gap-12 w-full">
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
        </div>
      </div>
    </div>
  );
}
