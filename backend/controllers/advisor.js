const OpenAI = require("openai");
const supabase = require("../config/supabase");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a knowledgeable, warm financial advisor integrated into a personal budgeting app — think of yourself as the friendly barber who gives straight-talking, 
jargon-free financial wisdom.

Your role is to help users understand their finances, build healthy habits, and make confident decisions. You have access to the user's net-worth snapshots and transaction history 
when provided as context.

## Core principles to weave into your guidance

**Pay yourself first.** Before spending anything, a portion of every paycheck should go straight to savings — automatically. This is the single most important financial habit. 
When a user discusses income or budgeting, gently reinforce this idea and suggest a target of around 10% of gross income as a starting point.

**Automation beats willpower.** For every savings goal, savings habit, or debt pay down plan, recommend setting up an automatic transfer. People don't fail because they lack discipline 
— they fail because they rely on it. Make the right behavior effortless.

**Simplicity is a feature.** Boring, consistent habits compound into life-changing results. Resist the urge to suggest complex strategies when a simple one will do. Time in the market, 
regular contributions, and living below your means outperform clever tactics almost every time.

**Build the foundation first.** When a user's situation suggests they're missing the basics, gently steer them toward: (1) an emergency fund of 3-6 months of expenses, (2) adequate 
insurance coverage (life, disability), and (3) a basic will — before chasing higher returns.

**Maximize tax-sheltered accounts early.** Encourage using tax-advantaged accounts (401(k), IRA, HSA, RRSP, TFSA, etc.) before investing in taxable accounts. Free money from employer 
matches should always come first.

**Compound growth rewards patience.** When relevant, remind users that starting early — even with small amounts — matters far more than the perfect strategy. A few years of delay can 
cost more than a lifetime of suboptimal investing.

**Avoid lifestyle inflation.** As income grows, the temptation to spend more grows with it. Help users notice this pattern and channel raises and windfalls toward savings goals first.

## How to communicate

- Be warm, direct, and non-judgmental. Meet users where they are without lecturing.
- Keep answers concise and actionable. One clear next step beats five vague ones.
- Never provide specific investment advice that could be considered a securities recommendation — guide toward general strategies and suggest a licensed professional for specific picks.
- When a user sets a goal, always recommend automating contributions to it.`;

const MODEL = process.env.ADVISOR_MODEL || "gpt-4o-mini";

// ------------------------------------------------------------------
// Helper: verify the conversation belongs to the requesting user
// ------------------------------------------------------------------
async function ownConversation(conversationId, userId) {
  const { data, error } = await supabase
    .from("advisor_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

// ------------------------------------------------------------------
// Helper: verify the snapshot belongs to the requesting user
// ------------------------------------------------------------------
async function ownSnapshot(snapshotId, userId) {
  const { data, error } = await supabase
    .from("net_worth_snapshots")
    .select("id")
    .eq("id", snapshotId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

// ------------------------------------------------------------------
// Helper: build the messages array for the OpenAI call, injecting
// any linked net-worth snapshot as additional system context.
// Pass allowDataAccess=false to strip financial data from the context.
// ------------------------------------------------------------------
async function buildChatMessages(conversationId, allowDataAccess = true) {
  let snapshotContext = "";

  if (allowDataAccess) {
    const { data: contextRows } = await supabase
      .from("advisor_conversation_context")
      .select("snapshot_id")
      .eq("conversation_id", conversationId);

    if (contextRows?.length) {
      const snapshotIds = contextRows.map((r) => r.snapshot_id).filter(Boolean);
      if (snapshotIds.length) {
        const { data: snapshots } = await supabase
          .from("net_worth_snapshots")
          .select("*, net_worth_snapshot_accounts(*)")
          .in("id", snapshotIds);

        if (snapshots?.length) {
          snapshotContext =
            "\n\nThe user has linked the following net-worth snapshot(s) to this conversation:\n" +
            JSON.stringify(snapshots, null, 2);
        }
      }
    }
  }

  const { data: messages, error } = await supabase
    .from("advisor_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return [
    { role: "system", content: SYSTEM_PROMPT + snapshotContext },
    ...messages,
  ];
}

// ------------------------------------------------------------------
// GET /conversations
// ------------------------------------------------------------------
async function listConversations(req, res, next) {
  try {
    const { data, error } = await supabase
      .from("advisor_conversations")
      .select("*")
      .eq("user_id", req.user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    res.json({ conversations: data });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// POST /conversations
// Body: { title?: string, snapshot_id?: string }
// ------------------------------------------------------------------
async function createConversation(req, res, next) {
  try {
    const { title = null, snapshot_id = null } = req.body;

    const { data: conversation, error: convErr } = await supabase
      .from("advisor_conversations")
      .insert({ user_id: req.user.id, title })
      .select()
      .single();

    if (convErr) throw convErr;

    if (snapshot_id) {
      if (!(await ownSnapshot(snapshot_id, req.user.id))) {
        return res.status(404).json({ error: "Snapshot not found" });
      }

      const { error: ctxErr } = await supabase
        .from("advisor_conversation_context")
        .insert({ conversation_id: conversation.id, snapshot_id });

      if (ctxErr) throw ctxErr;
    }

    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// GET /conversations/:id
// ------------------------------------------------------------------
async function getConversation(req, res, next) {
  try {
    const { data, error } = await supabase
      .from("advisor_conversations")
      .select("*, advisor_conversation_context(snapshot_id)")
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (error) throw error;
    res.json({ conversation: data });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// PATCH /conversations/:id
// Body: { title?: string, status?: 'active' | 'archived' }
// ------------------------------------------------------------------
async function updateConversation(req, res, next) {
  try {
    const allowed = {};
    if (req.body.title !== undefined) allowed.title = req.body.title;
    if (req.body.status !== undefined) {
      if (!["active", "archived"].includes(req.body.status)) {
        return res.status(400).json({ error: "status must be 'active' or 'archived'" });
      }
      allowed.status = req.body.status;
    }

    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const { data, error } = await supabase
      .from("advisor_conversations")
      .update(allowed)
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .single();

    if (error && error.code === "PGRST116") {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (error) throw error;
    res.json({ conversation: data });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// DELETE /conversations/:id
// ------------------------------------------------------------------
async function deleteConversation(req, res, next) {
  try {
    const { error } = await supabase
      .from("advisor_conversations")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", req.user.id);

    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// GET /conversations/:id/messages
// Query: ?limit=50&before=<ISO timestamp>
// ------------------------------------------------------------------
async function getMessages(req, res, next) {
  try {
    const { id: conversationId } = req.params;

    if (!(await ownConversation(conversationId, req.user.id))) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before;

    let query = supabase
      .from("advisor_messages")
      .select("id, conversation_id, role, content, metadata, tokens_used, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    const nextCursor =
      messages.length === limit
        ? messages[messages.length - 1].created_at
        : null;

    res.json({ messages, next_cursor: nextCursor });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// POST /conversations/:id/messages
// Body: { content: string }
//
// Saves the user message, calls the AI model, saves the assistant
// reply, and returns both messages. Auto-generates a title on the
// first user message if the conversation has none.
// ------------------------------------------------------------------
async function sendMessage(req, res, next) {
  try {
    const { id: conversationId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "content is required and must be a non-empty string" });
    }

    // Check AI preference flags before doing any work
    const { data: prefs } = await supabase
      .from("user_ai_preferences")
      .select("enable_ai_advisor, allow_ai_data_access")
      .eq("user_id", req.user.id)
      .maybeSingle();

    // Default to enabled when no row exists (new users inherit opt-out defaults)
    const advisorEnabled = prefs ? prefs.enable_ai_advisor : true;
    const dataAccessAllowed = prefs ? prefs.allow_ai_data_access : true;

    if (!advisorEnabled) {
      return res.status(403).json({ error: "AI Advisor is disabled in your preferences." });
    }

    if (!(await ownConversation(conversationId, req.user.id))) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // 1. Persist the user message
    const { data: userMsg, error: userErr } = await supabase
      .from("advisor_messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: content.trim(),
      })
      .select()
      .single();

    if (userErr) throw userErr;

    // 2. Build full message history and call the model
    const chatMessages = await buildChatMessages(conversationId, dataAccessAllowed);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: chatMessages,
    });

    const choice = completion.choices[0];
    const assistantContent = choice.message.content;
    const tokensUsed = completion.usage?.total_tokens ?? null;

    // 3. Persist the assistant reply
    const { data: assistantMsg, error: asstErr } = await supabase
      .from("advisor_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: assistantContent,
        metadata: {
          model: completion.model,
          finish_reason: choice.finish_reason,
        },
        tokens_used: tokensUsed,
      })
      .select()
      .single();

    if (asstErr) throw asstErr;

    // 4. Auto-generate a title from the first exchange if missing
    const { data: conv } = await supabase
      .from("advisor_conversations")
      .select("title")
      .eq("id", conversationId)
      .single();

    if (!conv?.title) {
      const titleCompletion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "Generate a concise 3-6 word title for the following conversation. Return only the title text, no quotes or punctuation.",
          },
          { role: "user", content: content.trim() },
          { role: "assistant", content: assistantContent },
        ],
        max_tokens: 20,
      });

      const generatedTitle = titleCompletion.choices[0].message.content.trim();

      await supabase
        .from("advisor_conversations")
        .update({ title: generatedTitle })
        .eq("id", conversationId);
    }

    res.status(201).json({ user_message: userMsg, assistant_message: assistantMsg });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// POST /conversations/:id/context
// Body: { snapshot_id: string }
// ------------------------------------------------------------------
async function addContext(req, res, next) {
  try {
    const { id: conversationId } = req.params;
    const { snapshot_id } = req.body;

    if (!snapshot_id) {
      return res.status(400).json({ error: "snapshot_id is required" });
    }

    if (!(await ownConversation(conversationId, req.user.id))) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!(await ownSnapshot(snapshot_id, req.user.id))) {
      return res.status(404).json({ error: "Snapshot not found" });
    }

    const { data, error } = await supabase
      .from("advisor_conversation_context")
      .insert({ conversation_id: conversationId, snapshot_id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ context: data });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// GET /conversations/:id/context
// ------------------------------------------------------------------
async function getContext(req, res, next) {
  try {
    const { id: conversationId } = req.params;

    if (!(await ownConversation(conversationId, req.user.id))) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const { data, error } = await supabase
      .from("advisor_conversation_context")
      .select("*, net_worth_snapshots(*, net_worth_snapshot_accounts(*))")
      .eq("conversation_id", conversationId);

    if (error) throw error;
    res.json({ context: data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listConversations,
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
  getMessages,
  sendMessage,
  addContext,
  getContext,
};
