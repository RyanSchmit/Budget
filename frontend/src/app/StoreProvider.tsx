"use client";

import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { store } from "../lib/store/store";
import { initFromStorage } from "../lib/store/keywordsSlice";
import { loadTransactionsSuccess } from "../lib/store/transactionsSlice";
import { loadTransactions } from "./transactions/loadTransactions";

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      store.dispatch(initFromStorage());
      loadTransactions().then((txs) => {
        store.dispatch(loadTransactionsSuccess(txs));
      });
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
