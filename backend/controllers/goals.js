const db = require("../config/db");
const {
  requireString,
  requireNumber,
  optionalNumber,
  optionalBoolean,
  requireEnum,
  validate,
} = require("../utils/validation");

const VALID_GOAL_TYPES = [
  "emergency_fund",
  "retirement",
  "home_down_payment",
  "debt_payoff",
  "custom",
];
const VALID_TIMELINES = ["flexible", "duration"];

function validateGoalBody(res, body) {
  return validate(res, [
    requireString(body.type, "type"),
    requireEnum(body.type, "type", VALID_GOAL_TYPES),
    requireString(body.name, "name", { maxLength: 200 }),
    requireNumber(body.targetAmount, "targetAmount", { min: 0 }),
    requireNumber(body.currentSavings, "currentSavings", { min: 0 }),
    requireNumber(body.weeklyContribution, "weeklyContribution", { min: 0 }),
    requireNumber(body.annualRate, "annualRate", { min: 0, max: 100 }),
    requireEnum(body.timeline, "timeline", VALID_TIMELINES),
    optionalNumber(body.durationYears, "durationYears", { min: 0, max: 100 }),
    optionalNumber(body.emergencyMonths, "emergencyMonths", { min: 0, max: 120 }),
    optionalNumber(body.currentAge, "currentAge", { min: 0, max: 150 }),
    optionalNumber(body.retirementAge, "retirementAge", { min: 0, max: 150 }),
    optionalNumber(body.desiredAnnualIncome, "desiredAnnualIncome", { min: 0 }),
    optionalNumber(body.homePrice, "homePrice", { min: 0 }),
    optionalNumber(body.debtInterestRate, "debtInterestRate", { min: 0, max: 100 }),
    optionalBoolean(body.autoTransferEnabled, "autoTransferEnabled"),
  ]);
}

// Columns written by create/update, in the order their values are bound.
const WRITABLE = [
  "type",
  "name",
  "target_amount",
  "current_savings",
  "weekly_contribution",
  "annual_rate",
  "timeline",
  "duration_years",
  "emergency_months",
  "current_age",
  "retirement_age",
  "desired_annual_income",
  "home_price",
  "debt_interest_rate",
  "auto_transfer_enabled",
];

function toValues(goal) {
  return [
    goal.type,
    goal.name.trim(),
    goal.targetAmount,
    goal.currentSavings,
    goal.weeklyContribution,
    goal.annualRate,
    goal.timeline,
    goal.durationYears ?? null,
    goal.emergencyMonths ?? null,
    goal.currentAge ?? null,
    goal.retirementAge ?? null,
    goal.desiredAnnualIncome ?? null,
    goal.homePrice ?? null,
    goal.debtInterestRate ?? null,
    goal.autoTransferEnabled ?? false,
  ];
}

function toGoal(row) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    targetAmount: Number(row.target_amount),
    currentSavings: Number(row.current_savings),
    weeklyContribution: Number(row.weekly_contribution),
    annualRate: Number(row.annual_rate),
    timeline: row.timeline,
    position: row.position != null ? Number(row.position) : null,
    durationYears: row.duration_years != null ? Number(row.duration_years) : undefined,
    emergencyMonths: row.emergency_months != null ? Number(row.emergency_months) : undefined,
    currentAge: row.current_age != null ? Number(row.current_age) : undefined,
    retirementAge: row.retirement_age != null ? Number(row.retirement_age) : undefined,
    desiredAnnualIncome: row.desired_annual_income != null ? Number(row.desired_annual_income) : undefined,
    homePrice: row.home_price != null ? Number(row.home_price) : undefined,
    debtInterestRate: row.debt_interest_rate != null ? Number(row.debt_interest_rate) : undefined,
    autoTransferEnabled: !!row.auto_transfer_enabled,
    createdAt: row.created_at,
  };
}

exports.list = async (req, res, next) => {
  try {
    const rows = await db.rows(
      `SELECT * FROM goals
        WHERE user_id = $1
        ORDER BY position ASC NULLS LAST, created_at ASC`,
      [req.user.id],
    );
    res.json(rows.map(toGoal));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    if (validateGoalBody(res, req.body)) return;

    const values = toValues(req.body);
    const placeholders = values.map((_, i) => `$${i + 2}`).join(", ");

    // position = current goal count, so new goals land at the end. Derived
    // in the same statement to avoid a separate count round trip.
    const row = await db.one(
      `INSERT INTO goals (user_id, ${WRITABLE.join(", ")}, position)
            VALUES ($1, ${placeholders},
                    (SELECT count(*) FROM goals WHERE user_id = $1))
         RETURNING *`,
      [req.user.id, ...values],
    );

    res.status(201).json(toGoal(row));
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    if (validateGoalBody(res, req.body)) return;

    const values = toValues(req.body);
    const assignments = WRITABLE.map((col, i) => `${col} = $${i + 1}`).join(", ");

    const row = await db.one(
      `UPDATE goals
          SET ${assignments}
        WHERE id = $${values.length + 1} AND user_id = $${values.length + 2}
      RETURNING *`,
      [...values, req.params.id, req.user.id],
    );

    if (!row) {
      return res.status(404).json({ error: "Goal not found" });
    }
    res.json(toGoal(row));
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const row = await db.one(
      `DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id],
    );

    if (!row) {
      return res.status(404).json({ error: "Goal not found" });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

exports.reorder = async (req, res, next) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Body must be an array of { id, position }" });
    }

    // All or nothing — a partial reorder leaves the list in a worse state
    // than not reordering at all.
    await db.transaction((client) =>
      Promise.all(
        items.map(({ id, position }) =>
          client.query(
            `UPDATE goals SET position = $1 WHERE id = $2 AND user_id = $3`,
            [position, id, req.user.id],
          ),
        ),
      ),
    );

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
