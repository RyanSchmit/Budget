"use client";

import { useState } from "react";
import { formatMoney } from "./format";

export default function MoneyInput({
  label,
  value,
  onChange,
  placeholder = "$0.00",
  className = "",
}) {
  const [display, setDisplay] = useState(value != null ? value.toString() : "");

  return (
    <label className="block mb-4">
      {label && (
        <span className="mb-1 block text-sm text-gray-300">{label}</span>
      )}

      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={display}
        className={`mt-1 block w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${className}`}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "");

          // prevent multiple decimals
          if ((raw.match(/\./g) || []).length > 1) return;

          setDisplay(raw);
          onChange(raw === "" ? null : Number(raw));
        }}
        onBlur={() => {
          if (value != null) {
            setDisplay(formatMoney(value));
          }
        }}
        onFocus={() => {
          if (value != null) {
            setDisplay(value.toString());
          }
        }}
      />
    </label>
  );
}
