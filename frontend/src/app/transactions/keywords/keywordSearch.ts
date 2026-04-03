import type { Rule } from "../../types";

export function rulePredict(
  description: string,
  amount: number,
  rules: Rule[],
): string {
  void amount; // reserved for future use (e.g., income/expense-specific rules)
  const text = String(description ?? "").toLowerCase();
  const effectiveRules = rules;

  for (const rule of effectiveRules) {
    if (rule.keywords.some((k) => text.includes(String(k).toLowerCase()))) {
      return rule.category;
    }
  }

  return "N/A";
}

type Token = string;
type SparseVec = Map<Token, number>;

export type TfidfPrediction = {
  category: string;
  score: number;
};

const DEFAULT_STOPWORDS = new Set<string>([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
]);

function tokenize(raw: string): Token[] {
  const text = String(raw ?? "").toLowerCase();
  const tokens = text
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/g)
    .filter(Boolean)
    .filter((t) => t.length > 1)
    .filter((t) => !DEFAULT_STOPWORDS.has(t));
  return tokens;
}

function l2Normalize(v: SparseVec): SparseVec {
  let sumSq = 0;
  for (const val of v.values()) sumSq += val * val;
  const norm = Math.sqrt(sumSq);
  if (!Number.isFinite(norm) || norm <= 0) return v;
  const out: SparseVec = new Map();
  for (const [k, val] of v.entries()) out.set(k, val / norm);
  return out;
}

function dot(a: SparseVec, b: SparseVec): number {
  // iterate smaller map
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  let s = 0;
  for (const [k, av] of small.entries()) {
    const bv = big.get(k);
    if (bv !== undefined) s += av * bv;
  }
  return s;
}

function addInPlace(target: SparseVec, add: SparseVec, scale = 1): void {
  for (const [k, v] of add.entries()) {
    target.set(k, (target.get(k) ?? 0) + v * scale);
  }
}

function toTfidfVec(tokens: Token[], idf: Map<Token, number>): SparseVec {
  const tf = new Map<Token, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

  const v: SparseVec = new Map();
  for (const [t, c] of tf.entries()) {
    const w = idf.get(t);
    if (!w) continue; // ignore unseen tokens
    v.set(t, c * w);
  }
  return l2Normalize(v);
}

export function buildTfidfCategoryPredictor(
  training: Array<{ description: string; category: string }>,
): { predict: (description: string) => TfidfPrediction } {
  // Filter/clean training examples
  const docs = training
    .map((t) => ({
      category: (t.category ?? "").trim(),
      tokens: tokenize(t.description),
    }))
    .filter((d) => d.category && d.category !== "N/A" && d.tokens.length > 0);

  const N = docs.length;
  if (N === 0) {
    return {
      predict: () => ({ category: "N/A", score: 0 }),
    };
  }

  // Document frequency
  const df = new Map<Token, number>();
  for (const d of docs) {
    const uniq = new Set(d.tokens);
    for (const t of uniq) df.set(t, (df.get(t) ?? 0) + 1);
  }

  // Smoothed IDF: log((N+1)/(df+1)) + 1
  const idf = new Map<Token, number>();
  for (const [t, c] of df.entries()) {
    idf.set(t, Math.log((N + 1) / (c + 1)) + 1);
  }

  // Category centroids (sum of normalized doc vectors, then normalize)
  const centroidByCategory = new Map<string, SparseVec>();
  const countsByCategory = new Map<string, number>();
  for (const d of docs) {
    const vec = toTfidfVec(d.tokens, idf);
    if (vec.size === 0) continue;
    const existing = centroidByCategory.get(d.category) ?? new Map();
    addInPlace(existing, vec, 1);
    centroidByCategory.set(d.category, existing);
    countsByCategory.set(d.category, (countsByCategory.get(d.category) ?? 0) + 1);
  }

  for (const [cat, v] of centroidByCategory.entries()) {
    const count = countsByCategory.get(cat) ?? 1;
    // average (optional) before normalize; scale doesn't matter after normalize,
    // but averaging helps keep numbers reasonable.
    const averaged: SparseVec = new Map();
    for (const [k, val] of v.entries()) averaged.set(k, val / count);
    centroidByCategory.set(cat, l2Normalize(averaged));
  }

  return {
    predict: (description: string) => {
      const q = toTfidfVec(tokenize(description), idf);
      if (q.size === 0) return { category: "N/A", score: 0 };

      let bestCat = "N/A";
      let bestScore = 0;
      for (const [cat, cVec] of centroidByCategory.entries()) {
        const score = dot(q, cVec);
        if (score > bestScore) {
          bestScore = score;
          bestCat = cat;
        }
      }

      return { category: bestCat, score: bestScore };
    },
  };
}
