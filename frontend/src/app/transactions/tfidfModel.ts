import { normalizeDescription } from "./normalizeDescription";

export type TfidfModel = {
  idf: Record<string, number>;
  centroids: Record<string, Record<string, number>>; // category -> token -> weight (L2-normalized)
};

export type TfidfPrediction = {
  category: string;
  score: number;
};

const STOPWORDS = new Set<string>([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "with",
]);

function tokenize(raw: string, amount?: number): string[] {
  // Normalize first: expands abbreviations (AMZN→AMAZON), strips IDs and state codes
  const normalized = normalizeDescription(String(raw ?? ""));
  const text = normalized.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const unigrams = text.length
    ? text.split(/\s+/g).filter(Boolean).filter((t) => t.length > 1).filter((t) => !STOPWORDS.has(t))
    : [];

  // Bigrams from post-filtered unigrams — captures brand names as single tokens
  // e.g. ["trader","joes"] → ["trader_joes"]
  const bigrams =
    unigrams.length >= 2
      ? unigrams.slice(0, -1).map((t, i) => `${t}_${unigrams[i + 1]}`)
      : [];

  // Amount feature tokens — lets the model learn price-category correlations
  // e.g. snacks cluster around __amt_micro, rent around __amt_xlarge
  const amountTokens: string[] = [];
  if (amount !== undefined && amount !== null && !Number.isNaN(amount)) {
    if (amount > 0) amountTokens.push("__sign_income");
    else if (amount < 0) amountTokens.push("__sign_expense");

    const abs = Math.abs(amount);
    if (abs < 5)        amountTokens.push("__amt_micro");
    else if (abs < 25)  amountTokens.push("__amt_small");
    else if (abs < 100) amountTokens.push("__amt_medium");
    else if (abs < 500) amountTokens.push("__amt_large");
    else                amountTokens.push("__amt_xlarge");
  }

  return [...unigrams, ...bigrams, ...amountTokens];
}

function l2NormalizeObj(v: Record<string, number>): Record<string, number> {
  let sumSq = 0;
  for (const k of Object.keys(v)) sumSq += v[k] * v[k];
  const norm = Math.sqrt(sumSq);
  if (!Number.isFinite(norm) || norm <= 0) return v;
  const out: Record<string, number> = {};
  for (const k of Object.keys(v)) out[k] = v[k] / norm;
  return out;
}

function dotObj(a: Record<string, number>, b: Record<string, number>): number {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  const [small, big] = aKeys.length <= bKeys.length ? [a, b] : [b, a];
  let s = 0;
  for (const k of Object.keys(small)) {
    const bv = big[k];
    if (bv !== undefined) s += small[k] * bv;
  }
  return s;
}

function toTfidfVec(tokens: string[], idf: Record<string, number>): Record<string, number> {
  const tf: Record<string, number> = {};
  for (const t of tokens) tf[t] = (tf[t] ?? 0) + 1;
  const v: Record<string, number> = {};
  for (const t of Object.keys(tf)) {
    const w = idf[t];
    if (!w) continue;
    v[t] = tf[t] * w;
  }
  return l2NormalizeObj(v);
}

export function buildTfidfModel(
  training: Array<{ description: string; category: string; amount?: number }>,
): TfidfModel | null {
  const docs = training
    .map((t) => ({
      category: (t.category ?? "").trim(),
      tokens: tokenize(t.description, t.amount),
    }))
    .filter((d) => d.category && d.category !== "N/A" && d.tokens.length > 0);

  const N = docs.length;
  if (N === 0) return null;

  const df: Record<string, number> = {};
  for (const d of docs) {
    const uniq = new Set(d.tokens);
    for (const tok of uniq) df[tok] = (df[tok] ?? 0) + 1;
  }

  // idf: log((N+1)/(df+1)) + 1
  const idf: Record<string, number> = {};
  for (const tok of Object.keys(df)) {
    idf[tok] = Math.log((N + 1) / (df[tok] + 1)) + 1;
  }

  // Centroids by category
  const sums: Record<string, Record<string, number>> = {};
  const counts: Record<string, number> = {};
  for (const d of docs) {
    const vec = toTfidfVec(d.tokens, idf);
    const cat = d.category;
    counts[cat] = (counts[cat] ?? 0) + 1;
    const dest = (sums[cat] ??= {});
    for (const tok of Object.keys(vec)) {
      dest[tok] = (dest[tok] ?? 0) + vec[tok];
    }
  }

  const centroids: Record<string, Record<string, number>> = {};
  for (const cat of Object.keys(sums)) {
    const count = counts[cat] ?? 1;
    const avg: Record<string, number> = {};
    for (const tok of Object.keys(sums[cat])) {
      avg[tok] = sums[cat][tok] / count;
    }
    centroids[cat] = l2NormalizeObj(avg);
  }

  return { idf, centroids };
}

export function predictWithModel(
  model: TfidfModel,
  description: string,
  amount?: number,
): TfidfPrediction {
  const q = toTfidfVec(tokenize(description, amount), model.idf);
  if (Object.keys(q).length === 0) return { category: "N/A", score: 0 };

  let bestCat = "N/A";
  let bestScore = 0;
  for (const cat of Object.keys(model.centroids)) {
    const score = dotObj(q, model.centroids[cat]);
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  }

  return { category: bestCat, score: bestScore };
}
