import { Transaction } from "../../types";
import { predictWithTFIDF } from "../tfidf";
import type { CategoryPredictionStrategy, PredictionContext } from "./types";

/** Predicts category using TF-IDF similarity against known categorized transactions. */
export class TFIDFStrategy implements CategoryPredictionStrategy {
  predict(transaction: Transaction, context?: PredictionContext): string {
    if (!context || context.categoryProfiles.size === 0) {
      return "N/A";
    }
    return predictWithTFIDF(transaction, context);
  }
}
