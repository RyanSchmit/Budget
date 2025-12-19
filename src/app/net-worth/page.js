"use client";

import Navbar from "../Navbar";
import { useState } from "react";
import MoneyInput from "../moneyInput";

export default function NetWorth() {
  const [checkingRaw, setCheckingRaw] = useState("");
  const [checkingValue, setCheckingValue] = useState(null);

  const [accounts, setAccounts] = useState([]);

  function addAccount() {
    setAccounts((prev) => [...prev, { id: Date.now(), name: "", amount: "" }]);
  }

  function updateAccount(id, field, value) {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id
          ? field === "amount"
            ? { ...a, amount: value }
            : { ...a, [field]: value }
          : a
      )
    );
  }

  function removeAccount(id) {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  const total =
    (typeof checkingValue === "number" ? checkingValue : 0) +
    accounts.reduce((sum, a) => {
      const n = parseFloat(a.amount);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <div className="min-h-screen bg-black font-sans text-white flex flex-col">
      <Navbar />

      <main className="flex-1 flex w-full flex-col items-center justify-center gap-8 bg-black">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <section className="bg-gray-900 p-6 rounded-md shadow-md max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Assets</h2>

            <label className="block mb-2">
              <span className="text-sm text-gray-300">Checking account</span>

              <MoneyInput
                label=""
                value={checkingValue}
                onChange={(val) => {
                  setCheckingValue(val);
                  setCheckingRaw(val != null ? val.toString() : "");
                }}
                placeholder="$0.00"
                className="mt-1"
              />
            </label>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Other accounts</span>
                <button
                  type="button"
                  onClick={addAccount}
                  className="text-sm bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-white"
                >
                  + Add account
                </button>
              </div>

              <div className="space-y-3">
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex gap-2">
                    <input
                      type="text"
                      value={acc.name}
                      onChange={(e) =>
                        updateAccount(acc.id, "name", e.target.value)
                      }
                      placeholder="Account name"
                      className="flex-1 bg-black border border-gray-700 rounded-md px-3 py-2 text-white"
                    />

                    <MoneyInput
                      label=""
                      value={acc.amount}
                      onChange={(val) => {
                        updateAccount(acc.id, "amount", val);
                      }}
                      placeholder="$0.00"
                      className="mt-1"
                    />

                    <button
                      type="button"
                      onClick={() => removeAccount(acc.id)}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <p className="text-sm text-gray-400">
                    No additional accounts added.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-gray-800 pt-4 flex items-center justify-between">
              <span className="text-sm text-gray-300">Current Net Worth</span>
              <span className="text-lg font-semibold">
                {currencyFormatter.format(total)}
              </span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
