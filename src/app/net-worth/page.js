"use client";

import Navbar from "../Navbar";
import { useState, useEffect } from "react";
import FinancialSection from "./Balances";
import { formatMoney } from "../format";
import NetWorthChart from "./NetWorthChart";

export default function NetWorth() {
  const [checkingValue, setCheckingValue] = useState(null);
  const [creditCardValue, setCreditCardValue] = useState(null);

  const [accounts, setAccounts] = useState([]);
  const [liabilities, setLiabilities] = useState([]);

  const [history, setHistory] = useState([]);

  const assetsTotal =
    (checkingValue || 0) +
    accounts.reduce((sum, acc) => sum + (acc.amount || 0), 0);

  const liabilitiesTotal =
    (creditCardValue || 0) +
    liabilities.reduce((sum, item) => sum + (item.amount || 0), 0);

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

  function addLiability() {
    setLiabilities((prev) => [
      ...prev,
      { id: Date.now(), name: "", amount: "" },
    ]);
  }

  function updateLiability(id, field, value) {
    setLiabilities((prev) =>
      prev.map((a) =>
        a.id === id
          ? field === "amount"
            ? { ...a, amount: value }
            : { ...a, [field]: value }
          : a
      )
    );
  }

  function removeLiability(id) {
    setLiabilities((prev) => prev.filter((a) => a.id !== id));
  }

  const netWorth = assetsTotal - liabilitiesTotal;

  useEffect(() => {
    const date = new Date().toLocaleDateString();

    setHistory((prev) => {
      if (prev.length && prev[prev.length - 1].value === netWorth) {
        return prev;
      }

      return [...prev, { date, value: netWorth }];
    });
  }, [netWorth]);

  return (
    <div className="min-h-screen bg-black font-sans text-white flex flex-col">
      <Navbar />

      <main className="flex-1 w-full flex flex-col items-center gap-10 bg-black pt-20 px-4">
        {/* Assets / Liabilities */}
        <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl">
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

        {/* Net Worth Value */}
        <h1 className="text-3xl font-bold">
          Net Worth: {formatMoney(netWorth)}
        </h1>

        {/* Chart */}
        <div className="w-full max-w-4xl">
          <NetWorthChart data={history} />
        </div>
      </main>
    </div>
  );
}
