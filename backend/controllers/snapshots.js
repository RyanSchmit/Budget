const supabase = require("../config/supabase");

exports.list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("net_worth_snapshots")
      .select("*, net_worth_snapshot_accounts(*)")
      .eq("user_id", req.user.id)
      .order("snapshot_date", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("net_worth_snapshots")
      .select("*, net_worth_snapshot_accounts(*)")
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Snapshot not found" });
    }
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { snapshot_date, accounts } = req.body;
    if (!snapshot_date || !Array.isArray(accounts) || accounts.length === 0) {
      return res.status(400).json({ error: "snapshot_date and a non-empty accounts array are required" });
    }

    // Upsert the snapshot row — if one already exists for this user+date, update it
    const { data: snapshot, error: snapError } = await supabase
      .from("net_worth_snapshots")
      .upsert(
        { user_id: req.user.id, snapshot_date, updated_at: new Date().toISOString() },
        { onConflict: "user_id,snapshot_date" }
      )
      .select()
      .single();

    if (snapError) throw snapError;

    // Replace all accounts for this snapshot
    const { error: delError } = await supabase
      .from("net_worth_snapshot_accounts")
      .delete()
      .eq("snapshot_id", snapshot.id)
      .eq("user_id", req.user.id);

    if (delError) throw delError;

    const accountRows = accounts.map((a) => ({
      snapshot_id: snapshot.id,
      user_id: req.user.id,
      account_key: a.account_key,
      account_name: a.account_name,
      amount: a.amount,
      account_type: a.account_type,
      sort_order: a.sort_order ?? 0,
    }));

    const { data: insertedAccounts, error: accError } = await supabase
      .from("net_worth_snapshot_accounts")
      .insert(accountRows)
      .select();

    if (accError) throw accError;

    res.status(201).json({ ...snapshot, net_worth_snapshot_accounts: insertedAccounts });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { snapshot_date } = req.body;

    const { data, error } = await supabase
      .from("net_worth_snapshots")
      .update({ snapshot_date, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select("*, net_worth_snapshot_accounts(*)")
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Snapshot not found" });
    }
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    // Cascade: delete child accounts first
    const { error: accError } = await supabase
      .from("net_worth_snapshot_accounts")
      .delete()
      .eq("snapshot_id", req.params.id)
      .eq("user_id", req.user.id);

    if (accError) throw accError;

    const { data, error } = await supabase
      .from("net_worth_snapshots")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Snapshot not found" });
    }
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
