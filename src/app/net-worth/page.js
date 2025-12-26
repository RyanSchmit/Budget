"use client";

import Navbar from "../Navbar";
import { useState } from "react";
import FinancialSection from "./Balances";
import { formatMoney } from "../format";
import NetWorthChart from "./NetWorthChart";
import { deriveNetWorthHistory } from "./Backwards";
import { transactions } from "../transactions.js";

export default function NetWorth() {
  const [checkingValue, setCheckingValue] = useState(null);
  const [creditCardValue, setCreditCardValue] = useState(null);

  const [accounts, setAccounts] = useState([]);
  const [liabilities, setLiabilities] = useState([]);

  // 🔑 Single source of truth for chart data
  const [history, setHistory] = useState([]);
  const [savedHistory, setSavedHistory] = useState([]);
  const [derivedHistory, setDerivedHistory] = useState([]);

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
    setAccounts((prev) => [...prev, { id: Date.now(), name: "", amount: "" }]);
  }

  function updateAccount(id, field, value) {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  }

  function removeAccount(id) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  /* -------------------- Liabilities -------------------- */

  function addLiability() {
    setLiabilities((prev) => [
      ...prev,
      { id: Date.now(), name: "", amount: "" },
    ]);
  }

  function updateLiability(id, field, value) {
    setLiabilities((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  }

  function removeLiability(id) {
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

  function mergeHistories(saved, derived) {
    const map = new Map();

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
      .sort((a, b) => new Date(a.date) - new Date(b.date));
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
                history.length && history[history.length - 1].value === netWorth
              }
              className={`px-4 py-2 bg-green-600 text-white rounded-md text-sm ${
                history.length && history[history.length - 1].value === netWorth
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-green-500"
              }`}
            >
              Save
            </button>

            <button
              type="button"
              onClick={workBackwards}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm"
            >
              Work Backwards
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
