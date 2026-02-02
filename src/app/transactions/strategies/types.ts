import { Transaction } from "../../types";

/** Context provided to strategies that need additional data (e.g. TF-IDF corpus). */
export interface PredictionContext {
  categoryProfiles: Map<string, string[][]>;
  allDocuments: string[][];
  vocabulary: Set<string>;
  idfCache: Map<string, number>;
}

/** Strategy for predicting a transaction's category. */
export interface CategoryPredictionStrategy {
  /** Returns predicted category or "N/A" if no prediction. */
  predict(transaction: Transaction, context?: PredictionContext): string;
}
