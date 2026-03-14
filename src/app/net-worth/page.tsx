"use client";

import Navbar from "../Navbar";
import { useState, useEffect, useMemo } from "react";
import FinancialSection from "./Balances";
import { formatMoney } from "../format";
import NetWorthChart from "./NetWorthChart";
import { deriveNetWorthHistory } from "./Backwards";
import { AccountItem, NetWorthHistoryItem } from "../types";
import type { Transaction } from "../types";
import { loadTransactions } from "../transactions/loadTransactions";
import {
  fetchLatestNetWorthSnapshot,
  saveNetWorthSnapshot,
} from "./netWorthDb";

export default function NetWorth() {
  const [checkingValue, setCheckingValue] = useState<number | null>(null);
  const [creditCardValue, setCreditCardValue] = useState<number | null>(null);

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [liabilities, setLiabilities] = useState<AccountItem[]>([]);

  // Transactions from database for "Work Backwards"
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);

  // 🔑 Single source of truth for chart data
  const [history, setHistory] = useState<NetWorthHistoryItem[]>([]);
  const [savedHistory, setSavedHistory] = useState<NetWorthHistoryItem[]>([]);
  const [derivedHistory, setDerivedHistory] = useState<NetWorthHistoryItem[]>(
    [],
  );

  // Getting transactions from database
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      const data = await loadTransactions();
      setTransactions(data);
      setLoading(false);
    };

    fetchTransactions();
    console.log(transactions);
  }, []);

  // Load most recent saved net worth snapshot (accounts + amounts)
  useEffect(() => {
    const loadSnapshot = async () => {
      try {
        const snapshot = await fetchLatestNetWorthSnapshot();
        if (!snapshot) return;

        const checking = snapshot.accounts.find((a) => a.key === "checking");
        const credit = snapshot.accounts.find((a) => a.key === "credit_card");

        setCheckingValue(checking ? checking.amount : null);
        setCreditCardValue(credit ? credit.amount : null);

        const assetAccounts: AccountItem[] = [];
        const liabilityAccounts: AccountItem[] = [];

        snapshot.accounts
          .filter((a) => !a.key)
          .forEach((a, idx) => {
            const item: AccountItem = {
              id: Date.now() + idx,
              name: a.name,
              amount: a.amount,
            };
            if (a.type === "asset") assetAccounts.push(item);
            else liabilityAccounts.push(item);
          });

        setAccounts(assetAccounts);
        setLiabilities(liabilityAccounts);
        setSnapshotDate(snapshot.date);
      } catch (e) {
        console.error("Failed to load net worth snapshot:", e);
      }
    };

    loadSnapshot();
  }, []);

  /* -------------------- Totals -------------------- */

  const assetsTotal =
    (checkingValue || 0) +
    accounts.reduce((sum, acc) => sum + (acc.amount || 0), 0);

  const liabilitiesTotal =
    (creditCardValue || 0) +
    liabilities.reduce((sum, item) => sum + (item.amount || 0), 0);

  const netWorth = assetsTotal - liabilitiesTotal;

  /* -------------------- Assets -------------------- */

  function addAccount() {
    setAccounts((prev) => [
      ...prev,
      { id: Date.now(), name: "", amount: null },
    ]);
  }

  function updateAccount(
    id: number,
    field: string,
    value: string | number | null,
  ) {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    );
  }

  function removeAccount(id: number) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  /* -------------------- Liabilities -------------------- */

  function addLiability() {
    setLiabilities((prev) => [
      ...prev,
      { id: Date.now(), name: "", amount: null },
    ]);
  }

  function updateLiability(
    id: number,
    field: string,
    value: string | number | null,
  ) {
    setLiabilities((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );
  }

  function removeLiability(id: number) {
    setLiabilities((prev) => prev.filter((l) => l.id !== id));
  }

  /* -------------------- Actions -------------------- */

  // ✅ Save ONLY when button is clicked
  const saveNetWorth = async () => {
    const date = new Date().toISOString().split("T")[0];

    try {
      const lines = [
        ...(checkingValue != null
          ? [
              {
                key: "checking" as const,
                name: "Checking account",
                amount: checkingValue,
                type: "asset" as const,
                sort_order: -100,
              },
            ]
          : []),
        ...accounts
          .filter((a) => a.name.trim() && a.amount != null)
          .map((a, idx) => ({
            name: a.name.trim(),
            amount: a.amount as number,
            type: "asset" as const,
            sort_order: idx,
          })),
        ...(creditCardValue != null
          ? [
              {
                key: "credit_card" as const,
                name: "Credit card balance",
                amount: creditCardValue,
                type: "liability" as const,
                sort_order: 10_000,
              },
            ]
          : []),
        ...liabilities
          .filter((l) => l.name.trim() && l.amount != null)
          .map((l, idx) => ({
            name: l.name.trim(),
            amount: l.amount as number,
            type: "liability" as const,
            sort_order: 10_001 + idx,
          })),
      ];

      await saveNetWorthSnapshot({ date, accounts: lines });

      setSavedHistory((prev) => {
        const existing = prev.find((h) => h.date === date);
        if (existing && existing.value === netWorth) return prev;
        const filtered = prev.filter((h) => h.date !== date);
        return [...filtered, { date, value: netWorth }];
      });
    } catch (e) {
      console.error("Failed to save net worth snapshot:", e);
    }
  };

  // 🔁 Work backwards from transactions
  const workBackwards = () => {
    const derived = deriveNetWorthHistory(transactions, netWorth);
    setDerivedHistory(derived);
  };

  function mergeHistories(
    saved: NetWorthHistoryItem[],
    derived: NetWorthHistoryItem[],
  ): NetWorthHistoryItem[] {
    const map = new Map<string, number>();

    // Start with derived history
    for (const item of derived) {
      map.set(item.date, item.value);
    }

    // Saved snapshots override derived values
    for (const item of saved) {
      map.set(item.date, item.value);
    }

    // Convert back to sorted array
    return Array.from(map.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  const mergedHistory = mergeHistories(savedHistory, derivedHistory);

  /* -------------------- Render -------------------- */

  return (
    <div className="min-h-screen bg-black font-sans text-white flex flex-col">
      <Navbar />

      {/* pt-20 prevents navbar overlap */}
      <main className="flex-1 w-full flex flex-col items-center gap-10 bg-black pt-20 px-4">
        {/* Assets / Liabilities */}
        <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl pt-6">
          <FinancialSection
            title="Assets"
            primaryLabel="Checking account"
            primaryValue={checkingValue}
            onPrimaryChange={setCheckingValue}
            items={accounts}
            addItem={addAccount}
            updateItem={updateAccount}
            removeItem={removeAccount}
            total={assetsTotal}
          />

          <FinancialSection
            title="Liabilities"
            primaryLabel="Credit card balance"
            primaryValue={creditCardValue}
            onPrimaryChange={setCreditCardValue}
            items={liabilities}
            addItem={addLiability}
            updateItem={updateLiability}
            removeItem={removeLiability}
            total={liabilitiesTotal}
            emptyText="No liabilities added."
          />
        </div>

        {/* Net Worth + Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <h1 className="text-3xl font-bold">
            Net Worth: {formatMoney(netWorth)}
          </h1>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveNetWorth}
              disabled={
                history.length > 0 &&
                history[history.length - 1].value === netWorth
              }
              className={`px-4 py-2 bg-green-600 text-white rounded-md text-sm ${
                history.length > 0 &&
                history[history.length - 1].value === netWorth
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-green-500"
              }`}
            >
              Save
            </button>

            <button
              type="button"
              onClick={workBackwards}
              disabled={loading}
              className={`px-4 py-2 bg-indigo-600 text-white rounded-md text-sm ${
                loading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-indigo-500"
              }`}
            >
              {loading ? "Loading…" : "Work Backwards"}
            </button>
          </div>
        </div>

        {snapshotDate && (
          <p className="text-sm text-gray-400">
            Data as of{" "}
            {new Date(snapshotDate + "T00:00:00").toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}

        {/* Chart */}
        <div className="w-full max-w-4xl pb-8 pr-4 sm:pr-6">
          <NetWorthChart data={mergedHistory} />
        </div>
      </main>
    </div>
  );
}
