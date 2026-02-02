import { Transaction } from "../types";

type Unsubscribe = () => void;

/**
 * Observer-pattern store for transactions. Holds current state and
 * last-known DB state (original). Notifies subscribers on any change so
 * UI can show dirty state and enable Save.
 */
export class TransactionStore {
  private transactions: Transaction[] = [];
  private originalById: Map<string, Transaction> = new Map();
  private subscribers: Set<() => void> = new Set();

  getTransactions(): Transaction[] {
    return this.transactions;
  }

  getOriginal(id: string): Transaction | undefined {
    return this.originalById.get(id);
  }

  /** Whether this transaction exists in the DB (numeric id). */
  isFromDb(id: string): boolean {
    return /^\d+$/.test(String(id).trim());
  }

  /** Set full list (e.g. after fetch). Also sets original snapshot for dirty detection. */
  setTransactions(data: Transaction[]): void {
    this.transactions = data;
    this.originalById = new Map(data.map((t) => [t.id, { ...t }]));
    this.notify();
  }

  /** Replace current list and original (e.g. after save + refetch). */
  setTransactionsAndOriginal(data: Transaction[]): void {
    this.transactions = data;
    this.originalById = new Map(data.map((t) => [t.id, { ...t }]));
    this.notify();
  }

  /** Update a single transaction locally (no DB call). Notifies observers. */
  updateTransaction(
    id: string,
    field: keyof Transaction,
    value: string | number,
  ): void {
    const idx = this.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const t = this.transactions[idx];
    const updated = { ...t, [field]: value };
    this.transactions = [
      ...this.transactions.slice(0, idx),
      updated,
      ...this.transactions.slice(idx + 1),
    ];
    this.notify();
  }

  /** Replace a transaction (e.g. after prediction). */
  setTransaction(updated: Transaction): void {
    const idx = this.transactions.findIndex((t) => t.id === updated.id);
    if (idx === -1) return;
    this.transactions = [
      ...this.transactions.slice(0, idx),
      updated,
      ...this.transactions.slice(idx + 1),
    ];
    this.notify();
  }

  /** Replace multiple transactions (e.g. bulk prediction). */
  setTransactionsSlice(updated: Transaction[]): void {
    const byId = new Map(updated.map((t) => [t.id, t]));
    this.transactions = this.transactions.map((t) => byId.get(t.id) ?? t);
    this.notify();
  }

  /** Add pending transactions (e.g. from CSV) to current list. */
  addPending(pending: Transaction[]): void {
    this.transactions = [...this.transactions, ...pending];
    this.notify();
  }

  /** Remove transactions by id (e.g. after delete). */
  removeByIds(ids: Set<string>): void {
    this.transactions = this.transactions.filter((t) => !ids.has(t.id));
    ids.forEach((id) => this.originalById.delete(id));
    this.notify();
  }

  /** Transactions that are new (not in DB) — e.g. UUID ids. */
  getNewTransactions(): Transaction[] {
    return this.transactions.filter((t) => !this.isFromDb(t.id));
  }

  /** Transactions that exist in DB but differ from original (dirty). */
  getDirtyTransactions(): Transaction[] {
    return this.transactions.filter((t) => {
      if (!this.isFromDb(t.id)) return false;
      const orig = this.originalById.get(t.id);
      if (!orig) return false;
      return (
        orig.date !== t.date ||
        orig.description !== t.description ||
        orig.category !== t.category ||
        orig.amount !== t.amount
      );
    });
  }

  /** Whether there are any changes to save (new or dirty). */
  hasChangesToSave(): boolean {
    return (
      this.getNewTransactions().length > 0 ||
      this.getDirtyTransactions().length > 0
    );
  }

  /** Whether this transaction is dirty (differs from original). */
  isDirty(id: string): boolean {
    const t = this.transactions.find((x) => x.id === id);
    if (!t || !this.isFromDb(t.id)) return false;
    const orig = this.originalById.get(t.id);
    if (!orig) return false;
    return (
      orig.date !== t.date ||
      orig.description !== t.description ||
      orig.category !== t.category ||
      orig.amount !== t.amount
    );
  }

  subscribe(callback: () => void): Unsubscribe {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    this.subscribers.forEach((cb) => cb());
  }
}
