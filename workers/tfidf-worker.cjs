"use strict";

const { parentPort, workerData } = require("worker_threads");

// Tokenize text into words
function tokenize(text) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^\w]/g, ""))
    .filter((word) => word.length > 0);
}

function calculateTF(word, document) {
  const wordCount = document.filter((w) => w === word).length;
  return wordCount > 0 ? wordCount / document.length : 0;
}

function calculateIDF(word, allDocuments) {
  const documentsContainingWord = allDocuments.filter((doc) =>
    doc.includes(word)
  ).length;
  if (documentsContainingWord === 0) return 0;
  return Math.log(allDocuments.length / documentsContainingWord);
}

function calculateTFIDFVector(document, vocabulary, allDocuments, idfCache) {
  const vector = new Map();
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

function cosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

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

function predictOne(transaction, context) {
  const { categoryProfiles, allDocuments, vocabulary, idfCache } = context;
  if (categoryProfiles.size === 0) return "N/A";

  const transactionTokens = tokenize(transaction.description);
  const transactionVector = calculateTFIDFVector(
    transactionTokens,
    vocabulary,
    allDocuments,
    idfCache
  );

  let bestCategory = "N/A";
  let bestScore = 0;

  for (const [category, categoryDocs] of categoryProfiles.entries()) {
    const combinedCategoryDoc = [];
    categoryDocs.forEach((doc) => combinedCategoryDoc.push(...doc));

    const categoryVector = calculateTFIDFVector(
      combinedCategoryDoc,
      vocabulary,
      allDocuments,
      idfCache
    );

    const similarity = cosineSimilarity(transactionVector, categoryVector);

    if (similarity > bestScore) {
      bestScore = similarity;
      bestCategory = category;
    }
  }

  const threshold = 0.01;
  return bestScore > threshold ? bestCategory : "N/A";
}

// workerData: { categoryProfilesObj, allDocuments, vocabularyArr, idfCacheObj, transactions }
const {
  categoryProfilesObj,
  allDocuments,
  vocabularyArr,
  idfCacheObj,
  transactions,
} = workerData;

const categoryProfiles = new Map(
  Object.entries(categoryProfilesObj).map(([k, v]) => [k, v])
);
const vocabulary = new Set(vocabularyArr);
const idfCache = new Map(Object.entries(idfCacheObj || {}));

const context = {
  categoryProfiles,
  allDocuments,
  vocabulary,
  idfCache,
};

const results = transactions.map((tx) => ({
  id: tx.id,
  category: predictOne(tx, context),
}));

parentPort.postMessage({ results });
parentPort.close();
