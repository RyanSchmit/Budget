import { Transaction } from "../../types";
import type { PredictionContext } from "./types";

// Helper to yield control to browser to prevent freezing
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

// Tokenize text into words (browser-compatible)
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^\w]/g, ""))
    .filter((word) => word.length > 0);
}

// Calculate Term Frequency (TF) for a word in a document
function calculateTF(word: string, document: string[]): number {
  const wordCount = document.filter((w) => w === word).length;
  return wordCount > 0 ? wordCount / document.length : 0;
}

// Calculate Inverse Document Frequency (IDF) for a word across all documents
function calculateIDF(word: string, allDocuments: string[][]): number {
  const documentsContainingWord = allDocuments.filter((doc) =>
    doc.includes(word)
  ).length;
  if (documentsContainingWord === 0) return 0;
  return Math.log(allDocuments.length / documentsContainingWord);
}

// Calculate TF-IDF vector for a document (optimized)
function calculateTFIDFVector(
  document: string[],
  vocabulary: Set<string>,
  allDocuments: string[][],
  idfCache: Map<string, number>
): Map<string, number> {
  const vector = new Map<string, number>();
  const docSet = new Set(document);

  for (const word of vocabulary) {
    if (docSet.has(word)) {
      const tf = calculateTF(word, document);
      let idf = idfCache.get(word);
      if (idf === undefined) {
        idf = calculateIDF(word, allDocuments);
        idfCache.set(word, idf);
      }
      vector.set(word, tf * idf);
    } else {
      vector.set(word, 0);
    }
  }

  return vector;
}

// Calculate cosine similarity between two vectors (optimized)
function cosineSimilarity(
  vec1: Map<string, number>,
  vec2: Map<string, number>
): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  // Only iterate over keys that exist in at least one vector
  const allKeys = new Set([...vec1.keys(), ...vec2.keys()]);
  for (const key of allKeys) {
    const val1 = vec1.get(key) || 0;
    const val2 = vec2.get(key) || 0;
    dotProduct += val1 * val2;
    norm1 += val1 * val1;
    norm2 += val2 * val2;
  }

  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// Build category profiles from categorized transactions
export function buildCategoryProfiles(categorizedTransactions: Transaction[]): {
  categoryProfiles: Map<string, string[][]>;
  allDocuments: string[][];
  vocabulary: Set<string>;
} {
  const categoryProfiles = new Map<string, string[][]>();
  const allDocuments: string[][] = [];
  const vocabulary = new Set<string>();

  // Group transactions by category
  const categoryGroups = new Map<string, Transaction[]>();
  categorizedTransactions.forEach((tx) => {
    if (tx.category && tx.category !== "N/A") {
      if (!categoryGroups.has(tx.category)) {
        categoryGroups.set(tx.category, []);
      }
      categoryGroups.get(tx.category)!.push(tx);
    }
  });

  // Tokenize descriptions for each category
  categoryGroups.forEach((transactions, category) => {
    const documents = transactions.map((tx) => {
      const tokens = tokenize(tx.description);
      tokens.forEach((word) => vocabulary.add(word));
      allDocuments.push(tokens);
      return tokens;
    });
    categoryProfiles.set(category, documents);
  });

  return { categoryProfiles, allDocuments, vocabulary };
}

// Predict category for a transaction using TF-IDF (optimized)
export function predictWithTFIDF(
  transaction: Transaction,
  context: PredictionContext
): string {
  const { categoryProfiles, allDocuments, vocabulary, idfCache } = context;
  if (categoryProfiles.size === 0) {
    return "N/A";
  }

  // Tokenize the transaction to categorize
  const transactionTokens = tokenize(transaction.description);

  // Calculate TF-IDF vector for the transaction
  const transactionVector = calculateTFIDFVector(
    transactionTokens,
    vocabulary,
    allDocuments,
    idfCache
  );

  // Calculate similarity to each category
  let bestCategory = "N/A";
  let bestScore = 0;

  for (const [category, categoryDocs] of categoryProfiles.entries()) {
    // Create a combined document for the category (all descriptions merged)
    const combinedCategoryDoc: string[] = [];
    categoryDocs.forEach((doc) => {
      combinedCategoryDoc.push(...doc);
    });

    // Calculate TF-IDF vector for the category
    const categoryVector = calculateTFIDFVector(
      combinedCategoryDoc,
      vocabulary,
      allDocuments,
      idfCache
    );

    // Calculate cosine similarity
    const similarity = cosineSimilarity(transactionVector, categoryVector);

    if (similarity > bestScore) {
      bestScore = similarity;
      bestCategory = category;
    }
  }

  // Only return a category if similarity is above a threshold
  const threshold = 0.01;
  return bestScore > threshold ? bestCategory : "N/A";
}

/** Build prediction context from categorized transactions for TF-IDF strategy. */
export function buildPredictionContext(
  categorizedTransactions: Transaction[]
): PredictionContext {
  const { categoryProfiles, allDocuments, vocabulary } = buildCategoryProfiles(
    categorizedTransactions
  );
  return {
    categoryProfiles,
    allDocuments,
    vocabulary,
    idfCache: new Map<string, number>(),
  };
}

/** Serialize context for worker threads (Maps/Sets → plain objects/arrays). */
function serializeContextForWorker(context: PredictionContext): {
  categoryProfilesObj: Record<string, string[][]>;
  allDocuments: string[][];
  vocabularyArr: string[];
  idfCacheObj: Record<string, number>;
} {
  return {
    categoryProfilesObj: Object.fromEntries(context.categoryProfiles),
    allDocuments: context.allDocuments,
    vocabularyArr: [...context.vocabulary],
    idfCacheObj: Object.fromEntries(context.idfCache),
  };
}

/** Run TF-IDF prediction in worker threads (Node only). Returns null if workers unavailable. */
async function categorizeNAWithWorkers(
  uncategorized: Transaction[],
  context: PredictionContext
): Promise<{ id: string; category: string }[] | null> {
  if (typeof process === "undefined" || !process.versions?.node) {
    return null;
  }

  try {
    const { Worker } = await import("worker_threads");
    const path = await import("path");
    const os = await import("os");

    const workerPath = path.join(process.cwd(), "workers", "tfidf-worker.cjs");
    const numWorkers = Math.min(
      os.cpus().length,
      Math.max(1, Math.ceil(uncategorized.length / 5))
    );
    const chunkSize = Math.ceil(uncategorized.length / numWorkers);
    const serialized = serializeContextForWorker(context);

    const workerPromises: Promise<{ id: string; category: string }[]>[] = [];
    for (let i = 0; i < numWorkers; i++) {
      const chunk = uncategorized.slice(
        i * chunkSize,
        i * chunkSize + chunkSize
      );
      if (chunk.length === 0) continue;

      workerPromises.push(
        new Promise((resolve, reject) => {
          const worker = new Worker(workerPath, {
            workerData: {
              ...serialized,
              transactions: chunk.map((tx) => ({
                id: tx.id,
                description: tx.description,
              })),
            },
          });
          worker.on(
            "message",
            (msg: { results: { id: string; category: string }[] }) => {
              resolve(msg.results);
            }
          );
          worker.on("error", reject);
          worker.on("exit", (code) => {
            if (code !== 0)
              reject(new Error(`Worker stopped with code ${code}`));
          });
        })
      );
    }

    const allResults = await Promise.all(workerPromises);
    return allResults.flat();
  } catch {
    return null;
  }
}

// Categorize all N/A transactions using TF-IDF (async with worker threads or batching)
export async function categorizeNAWithTFIDF(
  transactions: Transaction[]
): Promise<Transaction[]> {
  // Separate categorized and uncategorized transactions
  const categorized = transactions.filter(
    (tx) => tx.category && tx.category !== "N/A"
  );
  const uncategorized = transactions.filter(
    (tx) => !tx.category || tx.category === "N/A"
  );

  if (uncategorized.length === 0 || categorized.length === 0) {
    return transactions;
  }

  // Build prediction context once (optimized)
  const context = buildPredictionContext(categorized);

  if (context.categoryProfiles.size === 0) {
    return transactions;
  }

  const updatedTransactions = [...transactions];

  // Try worker threads first (Node.js only)
  const workerResults = await categorizeNAWithWorkers(uncategorized, context);
  if (workerResults) {
    const resultById = new Map(workerResults.map((r) => [r.id, r.category]));
    for (let i = 0; i < updatedTransactions.length; i++) {
      const cat = resultById.get(updatedTransactions[i].id);
      if (cat !== undefined) {
        updatedTransactions[i] = { ...updatedTransactions[i], category: cat };
      }
    }
    return updatedTransactions;
  }

  // Fallback: process in batches (browser or when workers unavailable)
  const batchSize = 10;
  for (let i = 0; i < uncategorized.length; i += batchSize) {
    await yieldToBrowser();

    const batch = uncategorized.slice(i, i + batchSize);

    for (const tx of batch) {
      const index = updatedTransactions.findIndex((t) => t.id === tx.id);
      if (index !== -1) {
        const predictedCategory = predictWithTFIDF(tx, context);
        updatedTransactions[index] = {
          ...tx,
          category: predictedCategory,
        };
      }
    }
  }

  return updatedTransactions;
}
