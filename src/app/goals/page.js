"use client";

import { useState } from "react";
import Navbar from "../Navbar";

export default function CompoundInterestInputs() {
  const [principal, setPrincipal] = useState(10000);
  const [weeklyContribution, setWeeklyContribution] = useState(200);
  const [annualRate, setAnnualRate] = useState(7);
  const [target, setTarget] = useState(100000);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <Navbar />

      {/* Centered Content */}
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-6 rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-lg">
          <h2 className="text-center text-2xl font-semibold">
            Compound Interest Calculator
          </h2>

          <InputField
            label="Starting Principal"
            prefix="$"
            value={principal}
            onChange={setPrincipal}
          />

          <InputField
            label="Weekly Contribution"
            prefix="$"
            value={weeklyContribution}
            onChange={setWeeklyContribution}
          />

          <InputField
            label="Annual Interest Rate"
            suffix="%"
            value={annualRate}
            onChange={setAnnualRate}
          />

          <InputField
            label="Target Amount"
            prefix="$"
            value={target}
            onChange={setTarget}
          />
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, prefix, suffix }) {
  return (
    <div className="space-y-1 my-2">
      <label className="block text-sm text-gray-400">{label}</label>

      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {prefix}
          </span>
        )}

        <input
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-2 text-white focus:border-green-500 focus:outline-none ${
            prefix ? "pl-8" : ""
          } ${suffix ? "pr-10" : ""}`}
        />

        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
