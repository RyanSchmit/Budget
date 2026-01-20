"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "./format";

interface MoneyInputProps {
  label?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
}

export default function MoneyInput({
  label,
  value,
  onChange,
  placeholder = "$0.00",
  className = "",
}: MoneyInputProps) {
  const [display, setDisplay] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Sync from parent ONLY when not editing
  useEffect(() => {
    if (isEditing) return;

    if (value == null || Number.isNaN(value)) {
      setDisplay("");
    } else {
      setDisplay(formatMoney(value));
    }
  }, [value, isEditing]);

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
        onFocus={() => {
          setIsEditing(true);
          if (value != null && !Number.isNaN(value)) {
            setDisplay(value.toString());
          }
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "");

          // Prevent multiple decimals
          if ((raw.match(/\./g) || []).length > 1) return;

          setDisplay(raw);
          onChange(raw === "" ? null : Number(raw));
        }}
        onBlur={() => {
          setIsEditing(false);

          if (value != null && !Number.isNaN(value)) {
            setDisplay(formatMoney(value));
          } else {
            setDisplay("");
          }
        }}
      />
    </div>
  );
}
