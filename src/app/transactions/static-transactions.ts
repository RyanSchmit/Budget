import type { Transaction } from "../types";

/**
 * Static transactions to import into the database via POST /api/import-transactions.
 * Add entries here for a one-time migration, then run the import endpoint.
 */
export const STATIC_TRANSACTIONS: Transaction[] = [];
