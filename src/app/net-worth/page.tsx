"use client";

import Navbar from "../Navbar";
import { useState, useEffect } from "react";
import FinancialSection from "./Balances";
import { formatMoney } from "../format";
import NetWorthChart from "./NetWorthChart";
import { deriveNetWorthHistory } from "./Backwards";
import { fetchTransactions } from "../transactions/actions";
import { AccountItem, NetWorthHistoryItem } from "../types";
import type { Transaction } from "../types";

export default function NetWorth() {
  const [checkingValue, setCheckingValue] = useState<number | null>(null);
  const [creditCardValue, setCreditCardValue] = useState<number | null>(null);

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [liabilities, setLiabilities] = useState<AccountItem[]>([]);

  // Transactions from database for "Work Backwards"
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  // 🔑 Single source of truth for chart data
  const [history, setHistory] = useState<NetWorthHistoryItem[]>([]);
  const [savedHistory, setSavedHistory] = useState<NetWorthHistoryItem[]>([]);
  const [derivedHistory, setDerivedHistory] = useState<NetWorthHistoryItem[]>(
    [],
  );

  // Load transactions from database
  useEffect(() => {
    async function loadTransactions() {
      try {
        setTransactionsLoading(true);
        const data = await fetchTransactions();
        setTransactions(data);
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setTransactionsLoading(false);
      }
    }
    loadTransactions();
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
  const saveNetWorth = () => {
    const date = new Date().toISOString().split("T")[0];

    setSavedHistory((prev) => {
      const existing = prev.find((h) => h.date === date);

      if (existing && existing.value === netWorth) {
        return prev;
      }

      // Replace if same date exists
      const filtered = prev.filter((h) => h.date !== date);

      return [...filtered, { date, value: netWorth }];
    });
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
              disabled={transactionsLoading}
              className={`px-4 py-2 bg-indigo-600 text-white rounded-md text-sm ${
                transactionsLoading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-indigo-500"
              }`}
            >
              {transactionsLoading ? "Loading…" : "Work Backwards"}
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="w-full max-w-4xl pb-8 pr-4 sm:pr-6">
          <NetWorthChart data={mergedHistory} />
        </div>
      </main>
    </div>
  );
}
