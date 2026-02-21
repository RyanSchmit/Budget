"use client";

import { useEffect, useRef } from "react";
import { Transaction } from "../types";
import { loadTransactions } from "./loadTransactions";

export default function LoadTransactionsClient({
  onLoaded,
}: {
  onLoaded: (transactions: Transaction[]) => void;
}) {
  const onLoadedRef = useRef(onLoaded);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const data = await loadTransactions();
      if (!cancelled) {
        onLoadedRef.current(data);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
