const OpenAI = require("openai");
const db = require("../config/db");

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

// Snapshot with its accounts embedded, matching the old nested-select shape.
const SNAPSHOT_WITH_ACCOUNTS = `
  SELECT s.*,
         COALESCE((
           SELECT json_agg(a ORDER BY a.sort_order, a.created_at)
             FROM net_worth_snapshot_accounts a
            WHERE a.snapshot_id = s.id
         ), '[]'::json) AS net_worth_snapshot_accounts
    FROM net_worth_snapshots s
`;

// ------------------------------------------------------------------
// Helper: verify the conversation belongs to the requesting user
// ------------------------------------------------------------------
async function ownConversation(conversationId, userId) {
  const row = await db.one(
    `SELECT id FROM advisor_conversations WHERE id = $1 AND user_id = $2`,
    [conversationId, userId],
  );
  return row !== null;
}

// ------------------------------------------------------------------
// Helper: verify the snapshot belongs to the requesting user
// ------------------------------------------------------------------
async function ownSnapshot(snapshotId, userId) {
  const row = await db.one(
    `SELECT id FROM net_worth_snapshots WHERE id = $1 AND user_id = $2`,
    [snapshotId, userId],
  );
  return row !== null;
}

// ------------------------------------------------------------------
// Helper: build the messages array for the OpenAI call, injecting
// any linked net-worth snapshot as additional system context.
// Pass allowDataAccess=false to strip financial data from the context.
// ------------------------------------------------------------------
async function buildChatMessages(conversationId, allowDataAccess = true) {
  let snapshotContext = "";

  if (allowDataAccess) {
    const snapshots = await db.rows(
      `${SNAPSHOT_WITH_ACCOUNTS}
        WHERE s.id IN (
          SELECT snapshot_id
            FROM advisor_conversation_context
           WHERE conversation_id = $1 AND snapshot_id IS NOT NULL
        )`,
      [conversationId],
    );

    if (snapshots.length) {
      snapshotContext =
        "\n\nThe user has linked the following net-worth snapshot(s) to this conversation:\n" +
        JSON.stringify(snapshots, null, 2);
    }
  }

  const messages = await db.rows(
    `SELECT role, content FROM advisor_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC`,
    [conversationId],
  );

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
    const conversations = await db.rows(
      `SELECT * FROM advisor_conversations WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.user.id],
    );
    res.json({ conversations });
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

    if (snapshot_id && !(await ownSnapshot(snapshot_id, req.user.id))) {
      return res.status(404).json({ error: "Snapshot not found" });
    }

    // Creating the conversation and linking its context is one unit, so a
    // failed link cannot leave an orphaned conversation behind.
    const conversation = await db.transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO advisor_conversations (user_id, title) VALUES ($1, $2) RETURNING *`,
        [req.user.id, title],
      );
      const created = rows[0];

      if (snapshot_id) {
        await client.query(
          `INSERT INTO advisor_conversation_context (conversation_id, snapshot_id)
                VALUES ($1, $2)`,
          [created.id, snapshot_id],
        );
      }

      return created;
    });

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
    const conversation = await db.one(
      `SELECT c.*,
              COALESCE((
                SELECT json_agg(json_build_object('snapshot_id', ctx.snapshot_id))
                  FROM advisor_conversation_context ctx
                 WHERE ctx.conversation_id = c.id
              ), '[]'::json) AS advisor_conversation_context
         FROM advisor_conversations c
        WHERE c.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user.id],
    );

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    res.json({ conversation });
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
    const assignments = [];
    const values = [];

    if (req.body.title !== undefined) {
      values.push(req.body.title);
      assignments.push(`title = $${values.length}`);
    }
    if (req.body.status !== undefined) {
      if (!["active", "archived"].includes(req.body.status)) {
        return res.status(400).json({ error: "status must be 'active' or 'archived'" });
      }
      values.push(req.body.status);
      assignments.push(`status = $${values.length}`);
    }

    if (assignments.length === 0) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const conversation = await db.one(
      `UPDATE advisor_conversations
          SET ${assignments.join(", ")}
        WHERE id = $${values.length + 1} AND user_id = $${values.length + 2}
      RETURNING *`,
      [...values, req.params.id, req.user.id],
    );

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    res.json({ conversation });
  } catch (err) {
    next(err);
  }
}

// ------------------------------------------------------------------
// DELETE /conversations/:id
// ------------------------------------------------------------------
async function deleteConversation(req, res, next) {
  try {
    // Messages and context rows go with it via ON DELETE CASCADE
    await db.query(
      `DELETE FROM advisor_conversations WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id],
    );
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

    const messages = await db.rows(
      `SELECT id, conversation_id, role, content, metadata, tokens_used, created_at
         FROM advisor_messages
        WHERE conversation_id = $1
          AND ($2::timestamptz IS NULL OR created_at < $2::timestamptz)
        ORDER BY created_at ASC
        LIMIT $3`,
      [conversationId, before ?? null, limit],
    );

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
    const prefs = await db.one(
      `SELECT enable_ai_advisor, allow_ai_data_access
         FROM user_ai_preferences WHERE user_id = $1`,
      [req.user.id],
    );

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
    const userMsg = await db.one(
      `INSERT INTO advisor_messages (conversation_id, role, content)
            VALUES ($1, 'user', $2)
         RETURNING *`,
      [conversationId, content.trim()],
    );

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
    const assistantMsg = await db.one(
      `INSERT INTO advisor_messages (conversation_id, role, content, metadata, tokens_used)
            VALUES ($1, 'assistant', $2, $3, $4)
         RETURNING *`,
      [
        conversationId,
        assistantContent,
        JSON.stringify({ model: completion.model, finish_reason: choice.finish_reason }),
        tokensUsed,
      ],
    );

    // 4. Auto-generate a title from the first exchange if missing
    const conv = await db.one(
      `SELECT title FROM advisor_conversations WHERE id = $1`,
      [conversationId],
    );

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

      await db.query(
        `UPDATE advisor_conversations SET title = $1 WHERE id = $2`,
        [generatedTitle, conversationId],
      );
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

    const context = await db.one(
      `INSERT INTO advisor_conversation_context (conversation_id, snapshot_id)
            VALUES ($1, $2)
         RETURNING *`,
      [conversationId, snapshot_id],
    );

    res.status(201).json({ context });
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

    const context = await db.rows(
      `SELECT ctx.*,
              (SELECT row_to_json(x) FROM (${SNAPSHOT_WITH_ACCOUNTS}
                 WHERE s.id = ctx.snapshot_id) x) AS net_worth_snapshots
         FROM advisor_conversation_context ctx
        WHERE ctx.conversation_id = $1`,
      [conversationId],
    );

    res.json({ context });
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
