"use client";

import Navbar from "../Navbar";
import { useState } from "react";
import FinancialSection from "./Balances";
import { formatMoney } from "../format";

export default function NetWorth() {
  const [checkingValue, setCheckingValue] = useState(null);
  const [creditCardValue, setCreditCardValue] = useState(null);

  const [accounts, setAccounts] = useState([]);
  const [liabilities, setLiabilities] = useState([]);

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

  return (
    <div className="min-h-screen bg-black font-sans text-white flex flex-col">
      <Navbar />

      <main className="flex-1 flex w-full flex-col items-center justify-center gap-8 bg-black">
        <div className="flex gap-6 justify-center w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <FinancialSection
            title="Assets"
            primaryLabel="Checking account"
            primaryValue={checkingValue}
            onPrimaryChange={(val) => setCheckingValue(val)}
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
            onPrimaryChange={(val) => setCreditCardValue(val)}
            items={liabilities}
            addItem={addLiability}
            updateItem={updateLiability}
            removeItem={removeLiability}
            total={liabilitiesTotal}
            emptyText="No liabilities added."
          />
        </div>
        <h1>NetWorth: {formatMoney(netWorth)}</h1>
      </main>
    </div>
  );
}
