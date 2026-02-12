"use client";

import { useCallback, useEffect } from "react";
import type { Transaction } from "../types";

export function saveTransactionsAsJson(
  transactions: Transaction[],
  filename = "transactions.json",
) {
  const jsonString = JSON.stringify(transactions, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ⌨️ Keyboard shortcut: Ctrl+S / Cmd+S to Save
export function useSaveShortcut(transactions: Transaction[], filename?: string) {
  const handleSave = useCallback(() => {
    saveTransactionsAsJson(transactions, filename ?? "transactions.json");
  }, [transactions, filename]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 🚫 Ignore shortcuts while typing in inputs
      const active = document.activeElement;
      if (active && ["INPUT", "TEXTAREA"].includes(active.tagName)) return;

      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const isSave =
        (isMac && e.metaKey && e.key === "s") ||
        (!isMac && e.ctrlKey && e.key === "s");

      if (!isSave) return;

      e.preventDefault();
      handleSave();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  return { handleSave };
}