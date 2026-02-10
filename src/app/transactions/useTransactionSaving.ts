"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Transaction } from "../types";
import { TransactionStore } from "./TransactionStore";
import {
  fetchTransactions,
  insertTransactions,
  updateTransaction,
} from "./actions";

export type SaveStatus = "success" | "error" | null;

export function useTransactionSaving(store: TransactionStore) {
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const saveInProgressRef = useRef(false);

  // Clear save status after a few seconds
  useEffect(() => {
    if (saveStatus === null) return;
    const t = setTimeout(() => setSaveStatus(null), 4000);
    return () => clearTimeout(t);
  }, [saveStatus]);

  const handleSave = useCallback(async () => {
    if (saveInProgressRef.current) return;
    const toInsert = store.getNewTransactions();
    const toUpdate = store.getDirtyTransactions();
    if (toInsert.length === 0 && toUpdate.length === 0) {
      return;
    }

    setSaveStatus(null);
    saveInProgressRef.current = true;
    try {
      setSaving(true);

      // Phase 1: wait for all writes to complete (no fetching yet)
      if (toInsert.length > 0) {
        const result = await insertTransactions(toInsert);
        if (!result.success) {
          setSaveStatus("error");
          setSaving(false);
          saveInProgressRef.current = false;
          return;
        }
      }
      if (toUpdate.length > 0) {
        const results = await Promise.all(
          toUpdate.map((t) =>
            updateTransaction(t.id, {
              date: t.date,
              description: t.description,
              category: t.category,
              amount: t.amount,
            })
          )
        );
        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) {
          setSaveStatus("error");
          setSaving(false);
          saveInProgressRef.current = false;
          return;
        }
      }

      // Phase 2: only after all saves are done, fetch a fresh copy
      const data = await fetchTransactions();
      store.setTransactionsAndOriginal(data);
      setSaveStatus("success");
    } catch (error) {
      console.error("Error saving transactions:", error);
      setSaveStatus("error");
    } finally {
      setSaving(false);
      saveInProgressRef.current = false;
    }
  }, [store]);

  // ⌨️ Keyboard shortcut: Ctrl+S / Cmd+S to Save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const isSave =
        (isMac && e.metaKey && e.key === "s") ||
        (!isMac && e.ctrlKey && e.key === "s");

      if (isSave) {
        e.preventDefault();
        if (store.hasChangesToSave() && !saving) handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [store, saving, handleSave]);

  /**
   * Insert pending transactions (e.g. from CSV). Returns true if saved and store
   * was updated; caller should clear pending state. Returns false on error or
   * if no transactions (caller can still clear pending).
   */
  async function savePending(transactions: Transaction[]): Promise<boolean> {
    if (transactions.length === 0) return false;
    if (saveInProgressRef.current) return false;
    saveInProgressRef.current = true;
    try {
      const result = await insertTransactions(transactions);
      if (result.success) {
        const data = await fetchTransactions();
        store.setTransactionsAndOriginal(data);
        return true;
      }
      console.error("Failed to save new transactions:", result.error);
      store.addPending(transactions);
      return false;
    } catch (error) {
      console.error("Error saving new transactions:", error);
      store.addPending(transactions);
      return false;
    } finally {
      saveInProgressRef.current = false;
    }
  }

  return { saving, saveStatus, handleSave, savePending };
}
