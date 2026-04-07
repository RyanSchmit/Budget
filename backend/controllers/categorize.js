const OpenAI = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.CATEGORIZE_MODEL || "gpt-4o-mini";

exports.categorize = async (req, res, next) => {
  try {
    const { items, categories } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: "categories must be a non-empty array" });
    }

    // Cap to avoid runaway costs
    const batch = items.slice(0, 200);
    const validCategories = categories.filter((c) => c && c !== "N/A");

    const prompt = `You are categorizing personal bank transactions. Assign each transaction to exactly one category from the list below. If none fits well, use "N/A".

Categories: ${validCategories.join(", ")}

Transactions to categorize:
${batch.map((item, i) => `${i + 1}. id="${item.id}" description="${item.description}"`).join("\n")}

Return ONLY a JSON object with this structure:
{"results": [{"id": "<id>", "category": "<category>"}, ...]}

Include exactly ${batch.length} items in results, one per transaction, in the same order.`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const results = Array.isArray(parsed.results) ? parsed.results : [];

    res.json({ results });
  } catch (err) {
    next(err);
  }
};
