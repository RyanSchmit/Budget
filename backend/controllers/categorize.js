const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.CATEGORIZE_MODEL || "gpt-4o-mini";
const BATCH_SIZE = 25; // small batches run in parallel — much faster than one giant prompt

async function categorizeBatch(batch, validCategories) {
  const prompt = `You are categorizing personal bank transactions. Assign each to one category. If none fits, use "N/A".

Categories: ${validCategories.join(", ")}

Transactions:
${batch.map((item, i) => `${i + 1}. id="${item.id}" description="${item.description}"`).join("\n")}

Return ONLY: {"results": [{"id": "<id>", "category": "<category>"}, ...]}`;

  const t0 = Date.now();
  console.log(`[categorize] OpenAI request — model=${MODEL} items=${batch.length}`);

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const ms = Date.now() - t0;
  const usage = completion.usage;
  console.log(
    `[categorize] OpenAI response — ${ms}ms | prompt_tokens=${usage?.prompt_tokens} completion_tokens=${usage?.completion_tokens}`,
  );

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  return Array.isArray(parsed.results) ? parsed.results : [];
}

exports.categorize = async (req, res, next) => {
  try {
    const { items, categories } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: "categories must be a non-empty array" });
    }

    const capped = items.slice(0, 200);
    const validCategories = categories.filter((c) => c && c !== "N/A");

    // Split into small chunks and fire them all in parallel
    const chunks = [];
    for (let i = 0; i < capped.length; i += BATCH_SIZE) {
      chunks.push(capped.slice(i, i + BATCH_SIZE));
    }

    console.log(
      `[categorize] Starting ${chunks.length} parallel batch(es) for ${capped.length} item(s)`,
    );
    const t0 = Date.now();

    const batchResults = await Promise.all(
      chunks.map((chunk) => categorizeBatch(chunk, validCategories)),
    );

    const results = batchResults.flat();
    console.log(`[categorize] Done — ${capped.length} items in ${Date.now() - t0}ms`);

    res.json({ results });
  } catch (err) {
    next(err);
  }
};
