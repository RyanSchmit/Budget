const supabase = require("../config/supabase");

function toRow(goal) {
  return {
    type: goal.type,
    name: goal.name,
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
    const { type, name, targetAmount } = req.body;
    if (!type || !name || targetAmount == null) {
      return res.status(400).json({ error: "type, name, and targetAmount are required" });
    }

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
