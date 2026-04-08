/**
 * Normalizes a raw bank transaction description before categorization.
 * The original description displayed in the UI is never modified —
 * this is called only internally within keyword matching and TF-IDF.
 */

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

// Multi-token abbreviations must be replaced before single-token pass
const MULTI_TOKEN_ABBREVS: Array<[RegExp, string]> = [
  [/\bSW\s+AIR\b/gi, "SOUTHWEST AIR"],
  [/\bWHOLE\s+FDS\b/gi, "WHOLE FOODS"],
  [/\bTRADER\s+JOE\b/gi, "TRADER JOES"],
  [/\bFIVE\s+GUYS\b/gi, "FIVE GUYS"],
  [/\bIN\s*N\s*OUT\b/gi, "INOUT BURGER"],
];

// Single-token abbreviation expansion (matched as whole words)
const ABBREV_MAP: Record<string, string> = {
  AMZN: "AMAZON",
  MKTP: "MARKETPLACE",
  SBUX: "STARBUCKS",
  WMT: "WALMART",
  TGT: "TARGET",
  WFM: "WHOLE FOODS",
  WHOLEFDS: "WHOLE FOODS",
  SWA: "SOUTHWEST",
  VZW: "VERIZON",
  VZWRLSS: "VERIZON",
  FDX: "FEDEX",
  WLGRN: "WALGREENS",
  MCD: "MCDONALDS",
  MCDS: "MCDONALDS",
  MCDONALD: "MCDONALDS",
  DD: "DUNKIN",
  DNKN: "DUNKIN",
  QT: "QUIKTRIP",
  NKE: "NIKE",
  CHKCARD: "",
  CHECKCARD: "",
  DEBIT: "",
  PURCHASE: "",
  POS: "",
  ACH: "",
  DDA: "",
  ORIG: "",
  CCD: "",
  PMT: "PAYMENT",
  PYMT: "PAYMENT",
  AUTOPAY: "AUTO PAYMENT",
  AUTOPMNT: "AUTO PAYMENT",
  WHOLEFOOD: "WHOLE FOODS",
  TRADERJ: "TRADER JOES",
  KROGER: "KROGER",
  INSTACART: "INSTACART",
  DOORDASH: "DOORDASH",
  GRUBHUB: "GRUBHUB",
  UBEREATS: "UBER EATS",
  LYFT: "LYFT",
  SQ: "SQUARE",
};

export function normalizeDescription(raw: string): string {
  if (!raw) return "";

  let s = raw.trim().toUpperCase();

  // 1. Strip common payment network prefixes
  s = s.replace(/^(TST\*\s*|SQ\s*\*\s*|PP\s*\*\s*|PAYPAL\s*\*\s*|VENMO\s*\*\s*)/i, "");

  // 2. Strip merchant ID suffixes: *AB12CD, #1234, STORE 5678, lone long numeric IDs
  s = s.replace(/\*[A-Z0-9]{4,}/gi, "");
  s = s.replace(/#\d+/g, "");
  s = s.replace(/\bSTORE\s+\d+\b/gi, "");
  s = s.replace(/\b\d{5,}\b/g, "");

  // 3. Strip trailing US state code (e.g. "SEATTLE WA" → "SEATTLE", but not "COSTCO")
  const trailingState = s.match(/\s+([A-Z]{2})$/);
  if (trailingState && US_STATES.has(trailingState[1])) {
    s = s.slice(0, s.length - trailingState[0].length);
  }

  // 4. Multi-token abbreviation expansion
  for (const [pattern, replacement] of MULTI_TOKEN_ABBREVS) {
    s = s.replace(pattern, replacement);
  }

  // 5. Single-token abbreviation expansion (whole-word match)
  s = s
    .split(/\s+/)
    .map((token) => {
      const expanded = ABBREV_MAP[token.toUpperCase()];
      if (expanded === undefined) return token;
      return expanded; // "" removes the token
    })
    .filter(Boolean)
    .join(" ");

  return s.trim();
}
