const supabase = require("../config/supabase");
const {
  requireString,
  requireNumber,
  optionalNumber,
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
  ]);
}

function toRow(goal) {
  return {
    type: goal.type,
    name: goal.name.trim(),
    target_amount: goal.targetAmount,
    current_savings: goal.currentSavings,
    weekly_contribution: goal.weeklyContribution,
    annual_rate: goal.annualRate,
    timeline: goal.timeline,
    duration_years: goal.durationYears ?? null,
    emergency_months: goal.emergencyMonths ?? null,
    current_age: goal.currentAge ?? null,
    retirement_age: goal.retirementAge ?? null,
    desired_annual_income: goal.desiredAnnualIncome ?? null,
    home_price: goal.homePrice ?? null,
    debt_interest_rate: goal.debtInterestRate ?? null,
  };
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
    durationYears: row.duration_years != null ? Number(row.duration_years) : undefined,
    emergencyMonths: row.emergency_months != null ? Number(row.emergency_months) : undefined,
    currentAge: row.current_age != null ? Number(row.current_age) : undefined,
    retirementAge: row.retirement_age != null ? Number(row.retirement_age) : undefined,
    desiredAnnualIncome: row.desired_annual_income != null ? Number(row.desired_annual_income) : undefined,
    homePrice: row.home_price != null ? Number(row.home_price) : undefined,
    debtInterestRate: row.debt_interest_rate != null ? Number(row.debt_interest_rate) : undefined,
    createdAt: row.created_at,
  };
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.json(data.map(toGoal));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    if (validateGoalBody(res, req.body)) return;

    const { data, error } = await supabase
      .from("goals")
      .insert({ user_id: req.user.id, ...toRow(req.body) })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(toGoal(data));
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    if (validateGoalBody(res, req.body)) return;

    const { data, error } = await supabase
      .from("goals")
      .update({ ...toRow(req.body), updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Goal not found" });
    }
    if (error) throw error;
    res.json(toGoal(data));
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Goal not found" });
    }
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
