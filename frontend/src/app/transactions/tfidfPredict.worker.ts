import { predictWithModel, type TfidfModel } from "./tfidfModel";

type WorkItem = { transact_id: string; description: string; amount?: number };
type Req = { model: TfidfModel; items: WorkItem[]; minScore: number };
type Resp = { predictions: Array<{ transact_id: string; category: string; score: number }> };

const ctx = globalThis as unknown as {
  onmessage: ((ev: MessageEvent<Req>) => void) | null;
  postMessage: (message: Resp) => void;
};

ctx.onmessage = (ev: MessageEvent<Req>) => {
  const { model, items, minScore } = ev.data;
  const predictions: Resp["predictions"] = [];

  for (const it of items) {
    const { category, score } = predictWithModel(model, it.description, it.amount);
    if (category !== "N/A" && score >= minScore) {
      predictions.push({ transact_id: it.transact_id, category, score });
    }
  }

  ctx.postMessage({ predictions } satisfies Resp);
};

