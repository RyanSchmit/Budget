"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "./format";

/** Evaluate a simple math expression: numbers and +, -, *, / (with * and / before + and -). */
function evaluateExpression(expr: string): number | null {
  const s = expr.replace(/\s/g, "").trim();
  if (!s) return null;
  const tokens: string[] = [];
  const r = /(-?\d+\.?\d*)|([+\-*/])/g;
  let m;
  while ((m = r.exec(s)) !== null) {
    tokens.push(m[1] !== undefined ? m[1] : m[2]);
  }
  let i = 0;
  function parseFactor(): number {
    if (i < tokens.length && tokens[i] === "-") {
      i++;
      return -parseFactor();
    }
    if (i >= tokens.length) return NaN;
    const t = tokens[i];
    if (t === "+" || t === "*" || t === "/") return NaN;
    i++;
    const n = Number(t);
    if (Number.isNaN(n)) return NaN;
    return n;
  }
  function parseTerm(): number {
    let v = parseFactor();
    while (i < tokens.length && (tokens[i] === "*" || tokens[i] === "/")) {
      const op = tokens[i++];
      const right = parseFactor();
      if (Number.isNaN(right)) return NaN;
      if (op === "/" && right === 0) return NaN;
      v = op === "*" ? v * right : v / right;
    }
    return v;
  }
  function parseExpr(): number {
    let v = parseTerm();
    while (i < tokens.length && (tokens[i] === "+" || tokens[i] === "-")) {
      const op = tokens[i++];
      const right = parseTerm();
      if (Number.isNaN(right)) return NaN;
      v = op === "+" ? v + right : v - right;
    }
    return v;
  }
  const result = parseExpr();
  if (i !== tokens.length || Number.isNaN(result)) return null;
  return result;
}

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Expression mode: = followed by numbers and +, -, *, /, spaces
    if (raw.startsWith("=")) {
      setDisplay(raw);
      // Don't update value until blur so user can edit the expression
      return;
    }
    const numericOnly = raw.replace(/[^0-9.-]/g, "");
    let normalized = numericOnly;
    if (numericOnly.includes("-")) {
      if (numericOnly.startsWith("-")) {
        normalized = "-" + numericOnly.slice(1).replace(/-/g, "");
      } else {
        normalized = numericOnly.replace(/-/g, "");
      }
    }
    if ((normalized.match(/\./g) || []).length > 1) return;
    setDisplay(normalized);
    onChange(
      normalized === "" || normalized === "-" ? null : Number(normalized)
    );
  };

  const handleBlur = () => {
    setIsEditing(false);
    const trimmed = display.trim();
    // If user entered an expression, evaluate it and use the result
    if (trimmed.startsWith("=")) {
      const result = evaluateExpression(trimmed.slice(1).trim());
      if (result !== null) {
        onChange(result);
        setDisplay(formatMoney(result));
      }
      return;
    }
    if (value != null && !Number.isNaN(value)) {
      setDisplay(formatMoney(value));
    } else {
      setDisplay("");
    }
  };

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
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  );
}
