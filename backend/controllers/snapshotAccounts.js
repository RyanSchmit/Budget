const supabase = require("../config/supabase");

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("net_worth_snapshot_accounts")
      .select("*")
      .eq("snapshot_id", req.params.snapshotId)
      .eq("user_id", req.user.id)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("net_worth_snapshot_accounts")
      .select("*")
      .eq("id", req.params.id)
      .eq("snapshot_id", req.params.snapshotId)
      .eq("user_id", req.user.id)
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Account entry not found" });
    }
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { account_key, account_name, amount, account_type, sort_order } = req.body;
    if (!account_key || !account_name || amount == null || !account_type) {
      return res.status(400).json({ error: "account_key, account_name, amount, and account_type are required" });
    }

    const { data, error } = await supabase
      .from("net_worth_snapshot_accounts")
      .insert({
        snapshot_id: req.params.snapshotId,
        user_id: req.user.id,
        account_key,
        account_name,
        amount,
        account_type,
        sort_order: sort_order ?? 0,
      })
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
    const { account_key, account_name, amount, account_type, sort_order } = req.body;

    const { data, error } = await supabase
      .from("net_worth_snapshot_accounts")
      .update({ account_key, account_name, amount, account_type, sort_order })
      .eq("id", req.params.id)
      .eq("snapshot_id", req.params.snapshotId)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Account entry not found" });
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
      .from("net_worth_snapshot_accounts")
      .delete()
      .eq("id", req.params.id)
      .eq("snapshot_id", req.params.snapshotId)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Account entry not found" });
    }
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
