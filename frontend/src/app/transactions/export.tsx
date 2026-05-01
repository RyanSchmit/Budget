"use client";

import Papa from "papaparse";
import { useEffect, useRef, useState } from "react";
import { Transaction } from "../types";

type ExportRow = {
  Date: string;
  Description: string;
  Category: string;
  Amount: number;
};

function toRows(transactions: Transaction[]): ExportRow[] {
  return [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => ({
      Date: t.date,
      Description: t.description,
      Category: t.category ?? "N/A",
      Amount: t.amount,
    }));
}

function toCsv(transactions: Transaction[]): string {
  return Papa.unparse(toRows(transactions), {
    columns: ["Date", "Description", "Category", "Amount"],
  });
}

function groupByMonth(transactions: Transaction[]): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>();
  for (const t of transactions) {
    // YYYY-MM-DD strings sort and slice cleanly.
    const key = (t.date ?? "").slice(0, 7) || "unknown";
    const list = map.get(key);
    if (list) list.push(t);
    else map.set(key, [t]);
  }
  return map;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the click has time to start the download in all browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExportButton({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const disabled = transactions.length === 0 || busy;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleExportAll = () => {
    if (transactions.length === 0) return;
    const csv = toCsv(transactions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `transactions-${todayStamp()}.csv`);
    setOpen(false);
  };

  const handleExportByMonth = async () => {
    if (transactions.length === 0 || busy) return;
    try {
      setBusy(true);
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();

      const groups = groupByMonth(transactions);
      const monthKeys = Array.from(groups.keys()).sort();
      for (const key of monthKeys) {
        const rows = groups.get(key) ?? [];
        const [yearStr, monthStr] = key.split("-");
        const monthName = new Date(
          Number(yearStr),
          Number(monthStr) - 1,
          1,
        ).toLocaleString("default", { month: "long" });
        zip.file(`transactions-${monthName}-${yearStr}.csv`, toCsv(rows));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `transactions-by-month-${todayStamp()}.zip`);
      setOpen(false);
    } catch (err) {
      console.error("Export by month failed:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export filtered transactions to CSV"
      >
        {busy ? "Exporting..." : "Export"}
      </button>

      {open && !disabled && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-md border border-gray-700 bg-gray-900 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleExportAll}
            className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800"
          >
            Single CSV
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleExportByMonth}
            className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-800"
          >
            One CSV per month (ZIP)
          </button>
        </div>
      )}
    </div>
  );
}
