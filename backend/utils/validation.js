/**
 * Lightweight input-validation helpers for Express controllers.
 *
 * Each validator returns an error string on failure, or null on success.
 * Use `validate()` to run a set of checks and send a 400 automatically.
 */

/** Value must be a finite number (rejects NaN, Infinity, strings, etc.). */
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// ── individual validators ────────────────────────────────────────────

function requireString(value, name, { maxLength = 500 } = {}) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return `${name} must be a non-empty string`;
  }
  if (value.length > maxLength) {
    return `${name} must be at most ${maxLength} characters`;
  }
  return null;
}

function requireNumber(value, name, { min, max } = {}) {
  if (!isFiniteNumber(value)) {
    return `${name} must be a finite number`;
  }
  if (min !== undefined && value < min) {
    return `${name} must be at least ${min}`;
  }
  if (max !== undefined && value > max) {
    return `${name} must be at most ${max}`;
  }
  return null;
}

function optionalNumber(value, name, opts) {
  if (value == null) return null;
  return requireNumber(value, name, opts);
}

function requireEnum(value, name, allowed) {
  if (!allowed.includes(value)) {
    return `${name} must be one of: ${allowed.join(", ")}`;
  }
  return null;
}

function requireDate(value, name) {
  if (typeof value !== "string" || isNaN(Date.parse(value))) {
    return `${name} must be a valid date string`;
  }
  return null;
}

// ── pagination helper ────────────────────────────────────────────────

function parsePagination(query, { defaultLimit = 50, maxLimit = 1000 } = {}) {
  const limit = Math.min(Math.max(1, parseInt(query.limit, 10) || defaultLimit), maxLimit);
  const page = Math.max(0, parseInt(query.page, 10) || 0);
  return { limit, page };
}

// ── runner ───────────────────────────────────────────────────────────

/**
 * Run an array of error-or-null results.  If any are non-null, send a
 * 400 response with the first error and return `true` (= had errors).
 *
 * Usage:
 *   if (validate(res, [ requireString(name, "name"), ... ])) return;
 */
function validate(res, checks) {
  const error = checks.find((c) => c !== null);
  if (error) {
    res.status(400).json({ error });
    return true;
  }
  return false;
}

module.exports = {
  requireString,
  requireNumber,
  optionalNumber,
  requireEnum,
  requireDate,
  parsePagination,
  validate,
};
