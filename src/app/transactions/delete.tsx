"use client";

import { useCallback, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { loadTransactions } from "./loadTransactions";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
  removeTransactionsByIds,
  clearSelectedIds,
  loadTransactionsSuccess,
} from "../../lib/store/transactionsSlice";
import { selectSelectedIdsSet } from "../../lib/store/selectors";

type Props = {
  reloadFromDb?: () => Promise<void>;
};

async function deleteTransactions(ids: string[]) {
  if (!ids || ids.length === 0) {
    return { success: false, error: "No IDs provided" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("transactions")
    .delete()
    .in("transact_id", ids);

  if (error) {
    console.error("Supabase delete error:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export default function DeleteSelectedButton({ reloadFromDb }: Props) {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector(selectSelectedIdsSet);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteSelected = useCallback(async () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0 || deleting) return;

    // optimistic update
    dispatch(removeTransactionsByIds(idsToDelete));
    dispatch(clearSelectedIds());

    try {
      setDeleting(true);
      const result = await deleteTransactions(idsToDelete);

      if (!result.success) {
        console.error("Failed to delete transactions:", result.error);
        if (reloadFromDb) {
          await reloadFromDb();
        } else {
          const fresh = await loadTransactions();
          dispatch(loadTransactionsSuccess(fresh));
        }
      }
    } catch (err) {
      console.error("Error deleting transactions:", err);
      if (reloadFromDb) {
        await reloadFromDb();
      } else {
        const fresh = await loadTransactions();
        dispatch(loadTransactionsSuccess(fresh));
      }
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, deleting, dispatch, reloadFromDb]);

  const disabled = selectedIds.size === 0 || deleting;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleDeleteSelected}
      className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
