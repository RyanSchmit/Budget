"use client";

import { useCallback, useState } from "react";
import { deleteTransaction } from "../../lib/api/client";
import { loadTransactions } from "./loadTransactions";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
  removeTransactionsByIds,
  clearSelectedIds,
  loadTransactionsSuccess,
} from "../../lib/store/transactionsSlice";
import { selectSelectedIdsSet, selectBaselineById } from "../../lib/store/selectors";

type Props = {
  reloadFromDb?: () => Promise<void>;
};

async function deleteTransactions(ids: string[]) {
  if (!ids || ids.length === 0) {
    return { success: false, error: "No IDs provided" };
  }

  try {
    await Promise.all(ids.map((id) => deleteTransaction(id)));
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Delete error:", message);
    return { success: false, error: message };
  }
}

export default function DeleteSelectedButton({ reloadFromDb }: Props) {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector(selectSelectedIdsSet);
  const baseline = useAppSelector(selectBaselineById);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteSelected = useCallback(async () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0 || deleting) return;

    dispatch(removeTransactionsByIds(idsToDelete));
    dispatch(clearSelectedIds());

    const savedIds = idsToDelete.filter((id) => id in baseline);

    try {
      setDeleting(true);
      const result =
        savedIds.length > 0
          ? await deleteTransactions(savedIds)
          : { success: true };

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
  }, [selectedIds, baseline, deleting, dispatch, reloadFromDb]);

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
