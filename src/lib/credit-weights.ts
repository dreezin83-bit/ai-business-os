/**
 * credit-weights.ts — PURE credit cost math (no DB, no side effects).
 *
 * Extracted from src/lib/credits.ts so the calibrated weights + formula are
 * dependency-free and unit-testable (see src/lib/__tests__/credit-weights.test.ts).
 * credits.ts imports these and re-exports the same names, so "@/lib/credits"
 * keeps its public API for all route handlers.
 *
 * CALIBRATED ANCHOR (CREDIT-CALIBRATION.md v2026-09-cal-v1, owner-ratified 2026-10-07):
 * 1 credit ≙ $0.005 of blended provider list-price cost; balances are INTEGER
 * milli-credits (1 credit = 1,000 milli). Unknown models fail CLOSED to the most
 * expensive listed weight (gpt-4o) so a typo/alias can never under-meter spend.
 *
 * P1 FIX (2026-10): OpenAI reports DATE-SUFFIXED model ids (completion.model
 * returns "gpt-4o-mini-2024-07-18", not "gpt-4o-mini"). The weight table keys are
 * family names, so an exact-match lookup fell back to fail-closed gpt-4o and
 * over-metered the default model ~16× (QA live evidence: 1,739/25 tokens →
 * 920 milli instead of 56). normalizeModelId() strips the trailing -YYYY-MM-DD
 * snapshot (and any "ft:" fine-tune prefix) before lookup; genuinely unknown
 * ids still fail closed to gpt-4o (never under-meter).
 */
export const MILLI = 1000; // milli-credits per credit

export interface ModelWeights {
  in: number; // credits per 1K input tokens
  out: number; // credits per 1K output tokens
}

function parseJsonEnv<T>(key: string): T | null {
  const raw = process.env[key];
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[credits] Invalid JSON in ${key} — ignoring override`);
    return null;
  }
}

// ── Weight table (CREDIT-CALIBRATION.md §3 — SOURCE OF TRUTH; env-overridable) ──
/** Credits per 1K tokens; price ÷ $0.005 anchor. Unknown model → gpt-4o (fail closed, most expensive). */
const MODEL_WEIGHTS_DEFAULT: Record<string, ModelWeights> = {
  "openai:gpt-4o-mini": { in: 0.030, out: 0.120 }, // $0.15/$0.60 per 1M (app default)
  "openai:gpt-4o": { in: 0.500, out: 2.000 },      // $2.50/$10.00 per 1M (fail-closed fallback)
  "openai:gpt-4.1-mini": { in: 0.080, out: 0.320 },// $0.40/$1.60 per 1M
  "openai:gpt-4.1-nano": { in: 0.020, out: 0.080 },// $0.10/$0.40 per 1M
  "openai:gpt-6-luna": { in: 0.020, out: 0.100 },  // $0.10/$0.50 per 1M
};

/**
 * Normalize a raw provider model id to its calibration-table family key.
 * OpenAI returns dated snapshots ("gpt-4o-mini-2024-07-18") and fine-tuned ids
 * ("ft:gpt-4o-mini:org-…:…"); the weight table keys are bare families.
 * Only well-formed patterns are transformed — anything unrecognized is returned
 * unchanged so the lookup misses and fails CLOSED to gpt-4o (never under-meter).
 */
export function normalizeModelId(model: string | null | undefined): string {
  if (!model) return "";
  let id = model.trim();
  if (id.startsWith("ft:")) {
    // Fine-tuned ids: "ft:<family>:<org>:<...>" — compare on the base family.
    id = id.slice(3).split(":")[0];
  }
  // OpenAI snapshot suffix: "-YYYY-MM-DD" (e.g. -2024-07-18, -2025-04-14).
  return id.replace(/-(?:19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "");
}

/**
 * Weight for a text model. Exact lookup on the NORMALIZED family key first
 * (overrides then defaults), then a raw-id fallback (covers exotic override
 * keys), then fail-closed gpt-4o.
 * @returns {ModelWeights} credits per 1K input/output tokens.
 */
export function modelWeights(model: string | null | undefined): ModelWeights {
  const overrides = parseJsonEnv<Record<string, ModelWeights>>("CREDIT_MODEL_WEIGHTS");
  const norm = normalizeModelId(model);
  const keys = norm ? [`openai:${norm}`] : [];
  if (model && norm !== model) keys.push(`openai:${model}`); // raw fallback for exotic override keys
  for (const key of keys) {
    const o = overrides?.[key];
    if (o && typeof o.in === "number" && typeof o.out === "number" && o.in >= 0 && o.out >= 0) return o;
    const def = MODEL_WEIGHTS_DEFAULT[key];
    if (def) return def;
  }
  return MODEL_WEIGHTS_DEFAULT["openai:gpt-4o"]; // fail closed: most expensive listed model
}

/** Credits per call-minute; worst-case all-in Vapi minute ÷ $0.005. Unknown stack → 26 (fail closed). */
const VOICE_WEIGHTS_DEFAULT: Record<string, number> = {
  "vapi:openai:gpt-4o": 26,      // $0.1289/min worst case → ceil 25.78 = 26
  "vapi:openai:gpt-4o-mini": 19, // $0.0914/min → ceil 18.28 = 19
};
export function voiceWeight(model: string | null | undefined): number {
  const overrides = parseJsonEnv<Record<string, number>>("CREDIT_VOICE_WEIGHTS");
  const norm = normalizeModelId(model);
  const keys = norm ? [`vapi:openai:${norm}`] : [];
  if (model && norm !== model) keys.push(`vapi:openai:${model}`); // raw fallback for exotic override keys
  for (const key of keys) {
    const o = overrides?.[key];
    if (typeof o === "number" && o > 0) return o;
    if (VOICE_WEIGHTS_DEFAULT[key] !== undefined) return VOICE_WEIGHTS_DEFAULT[key];
  }
  return 26; // fail closed: most expensive stack
}

/**
 * The ONLY place credit costs are computed (spec §2/§3). Returns INTEGER milli-credits.
 *  text:  ceil((tokens_in/1000 × w_in + tokens_out/1000 × w_out) × 1000)
 *  voice: ceil(minutes × w_voice × 1000)   (minutes = ceil(seconds/60), floored at 1)
 * Ceil → never under-charge; milli scale keeps rounding drift < 0.001 credit/event.
 */
export function computeCreditsMilli(op: {
  provider: "openai" | "vapi";
  model?: string | null;
  tokensIn?: number;
  tokensOut?: number;
  minutes?: number; // voice: billable minutes (ceil of seconds/60)
}): number {
  if (op.provider === "vapi") {
    const perMinute = voiceWeight(op.model);
    const minutes = Math.max(1, Math.ceil(op.minutes ?? 0));
    return Math.max(1, Math.ceil(minutes * perMinute * MILLI));
  }
  const w = modelWeights(op.model);
  const tin = Math.max(0, op.tokensIn ?? 0);
  const tout = Math.max(0, op.tokensOut ?? 0);
  const milli = Math.ceil((tin / 1000 * w.in + tout / 1000 * w.out) * MILLI);
  return Math.max(1, milli);
}