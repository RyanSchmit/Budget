"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "./format";

export default function MoneyInput({
  label,
  value,
  onChange,
  placeholder = "$0.00",
  className = "",
}) {
  const [display, setDisplay] = useState("");

  // 🔁 Sync when parent value changes
  useEffect(() => {
    if (value == null || Number.isNaN(value)) {
      setDisplay("");
    } else {
      setDisplay(formatMoney(value));
    }
  }, [value]);

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1 block text-sm text-gray-300">{label}</label>
      )}

      <input
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={display}
        className={`h-10 w-full bg-black border border-gray-700 rounded-md px-3 text-white ${className}`}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "");

          // Prevent multiple decimals
          if ((raw.match(/\./g) || []).length > 1) return;

          setDisplay(raw);
          onChange(raw === "" ? null : Number(raw));
        }}
        onFocus={() => {
          if (value != null) {
            setDisplay(value.toString());
          }
        }}
        onBlur={() => {
          if (value != null && !Number.isNaN(value)) {
            setDisplay(formatMoney(value));
          }
        }}
      />
    </div>
  );
}
