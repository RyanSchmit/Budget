"use client";

import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { store } from "../lib/store/store";
import { initFromStorage } from "../lib/store/keywordsSlice";
import { loadTransactionsSuccess } from "../lib/store/transactionsSlice";
import { loadPreferences } from "../lib/store/preferencesSlice";
import { loadTransactions } from "./transactions/loadTransactions";
import { createClient } from "@/lib/supabase/client";

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

      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          loadTransactions().then((txs) => {
            store.dispatch(loadTransactionsSuccess(txs));
          });
          store.dispatch(loadPreferences());
        }
      });
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
