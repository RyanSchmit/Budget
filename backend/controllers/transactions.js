const supabase = require("../config/supabase");

exports.list = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 1000, 1000);
    const page  = parseInt(req.query.page) || 0;
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
      .eq("transaction_id", req.params.id)
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
    if (!date || !description || !category || amount == null) {
      return res.status(400).json({ error: "date, description, category, and amount are required" });
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({ user_id: req.user.id, date, description, category, amount })
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

    const { data, error } = await supabase
      .from("transactions")
      .update({ date, description, category, amount, updated_at: new Date().toISOString() })
      .eq("transaction_id", req.params.id)
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

exports.remove = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .delete()
      .eq("transaction_id", req.params.id)
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
