const supabase = require("../config/supabase");
const {
  requireString,
  requireNumber,
  requireDate,
  parsePagination,
  validate,
} = require("../utils/validation");

exports.list = async (req, res, next) => {
  try {
    const { limit, page } = parsePagination(req.query, { defaultLimit: 1000, maxLimit: 1000 });
    const from  = page * limit;
    const to    = from + limit - 1;

    const { data, count, error } = await supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("user_id", req.user.id)
      .order("date", { ascending: false })
      .range(from, to);

    if (error) throw error;
    res.json({ data, count });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("transact_id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Transaction not found" });
    }
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { date, description, category, amount } = req.body;
    if (validate(res, [
      requireDate(date, "date"),
      requireString(description, "description", { maxLength: 500 }),
      requireString(category, "category", { maxLength: 100 }),
      requireNumber(amount, "amount"),
    ])) return;

    const { data, error } = await supabase
      .from("transactions")
      .insert({ user_id: req.user.id, date, description: description.trim(), category: category.trim(), amount })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { date, description, category, amount } = req.body;
    if (validate(res, [
      requireDate(date, "date"),
      requireString(description, "description", { maxLength: 500 }),
      requireString(category, "category", { maxLength: 100 }),
      requireNumber(amount, "amount"),
    ])) return;

    const { data, error } = await supabase
      .from("transactions")
      .update({ date, description: description.trim(), category: category.trim(), amount, updated_at: new Date().toISOString() })
      .eq("transact_id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Transaction not found" });
    }
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.bulkUpdate = async (req, res, next) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: "transactions must be a non-empty array" });
    }
    if (transactions.length > 200) {
      return res.status(400).json({ error: "Maximum 200 transactions per request" });
    }

    const errors = [];
    const validated = [];

    for (let i = 0; i < transactions.length; i++) {
      const { id, date, description, category, amount } = transactions[i];
      if (!id || typeof id !== "string") {
        errors.push({ index: i, errors: ["id is required"] });
        continue;
      }
      const itemErrors = [
        requireDate(date, "date"),
        requireString(description, "description", { maxLength: 500 }),
        requireString(category, "category", { maxLength: 100 }),
        requireNumber(amount, "amount"),
      ].filter(Boolean);

      if (itemErrors.length > 0) {
        errors.push({ index: i, errors: itemErrors });
      } else {
        validated.push({ id, date, description: description.trim(), category: category.trim(), amount });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const now = new Date().toISOString();
    const results = await Promise.all(
      validated.map((t) =>
        supabase
          .from("transactions")
          .update({ date: t.date, description: t.description, category: t.category, amount: t.amount, updated_at: now })
          .eq("transact_id", t.id)
          .eq("user_id", req.user.id)
          .select()
          .single()
      ),
    );

    const failed = results
      .map((r, i) => (r.error ? { index: i, id: validated[i].id, error: r.error.message } : null))
      .filter(Boolean);

    if (failed.length > 0) {
      return res.status(207).json({
        data: results.filter((r) => !r.error).map((r) => r.data),
        errors: failed,
      });
    }

    res.json({ data: results.map((r) => r.data) });
  } catch (err) {
    next(err);
  }
};

exports.bulkCreate = async (req, res, next) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: "transactions must be a non-empty array" });
    }
    if (transactions.length > 200) {
      return res.status(400).json({ error: "Maximum 200 transactions per request" });
    }

    const errors = [];
    const rows = [];

    for (let i = 0; i < transactions.length; i++) {
      const { date, description, category, amount } = transactions[i];
      const itemErrors = [
        requireDate(date, "date"),
        requireString(description, "description", { maxLength: 500 }),
        requireString(category, "category", { maxLength: 100 }),
        requireNumber(amount, "amount"),
      ].filter(Boolean);

      if (itemErrors.length > 0) {
        errors.push({ index: i, errors: itemErrors });
      } else {
        rows.push({
          user_id: req.user.id,
          date,
          description: description.trim(),
          category: category.trim(),
          amount,
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert(rows)
      .select();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .delete()
      .eq("transact_id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Transaction not found" });
    }
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
