const supabase = require("../config/supabase");
const { requireString, requireNumber, validate } = require("../utils/validation");

function toRow(body) {
  return {
    category_name: body.categoryName.trim(),
    monthly_limit: body.monthlyLimit,
  };
}

function toLimit(row) {
  return {
    id: row.id,
    categoryName: row.category_name,
    monthlyLimit: Number(row.monthly_limit),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("category_limits")
      .select("*")
      .eq("user_id", req.user.id)
      .order("category_name", { ascending: true });

    if (error) throw error;
    res.json(data.map(toLimit));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { categoryName, monthlyLimit } = req.body;
    if (validate(res, [
      requireString(categoryName, "categoryName", { maxLength: 100 }),
      requireNumber(monthlyLimit, "monthlyLimit", { min: 0 }),
    ])) return;

    const { data, error } = await supabase
      .from("category_limits")
      .insert({ user_id: req.user.id, ...toRow(req.body) })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(toLimit(data));
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { monthlyLimit } = req.body;
    if (validate(res, [
      requireNumber(monthlyLimit, "monthlyLimit", { min: 0 }),
    ])) return;

    const { data, error } = await supabase
      .from("category_limits")
      .update({ monthly_limit: monthlyLimit, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Category limit not found" });
    }
    if (error) throw error;
    res.json(toLimit(data));
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { error } = await supabase
      .from("category_limits")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Category limit not found" });
    }
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
