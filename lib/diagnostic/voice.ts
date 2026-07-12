// Authority Diagnostic — voice + CTA law validator.
// Spec: scoring-engine.md §5 and report-blueprint.md §5V. A report containing
// a banned word or banned CTA fails validation — build fails, agent re-runs.

export const BANNED_WORDS = [
  "synergy", "synergistic", "move the needle", "touch base", "circle back",
  "best-in-class", "cutting-edge", "end-to-end solution", "holistic approach",
  "thought leader", "disrupt", "disruptive", "at the end of the day",
  "it goes without saying", "in today's competitive landscape",
  "take your business to the next level",
];
// "leverage" is banned as a verb — catch the common verb constructions without
// flagging the noun ("ad leverage" is fine, "leverage your audience" is not).
const LEVERAGE_VERB = /\bleverag(e|ing|es|ed)\b\s+(your|the|our|this|these|that|it|them|social|existing|data)/i;

export const BANNED_CTAS = [
  "book a call with me", "schedule a call", "learn more", "click here",
  "click here to book", "want to chat?", "let's talk", "hop on a call",
  "call me to learn more", "get in touch", "contact us today", "sign up",
];

export type VoiceViolation = { path: string; kind: "banned_word" | "banned_cta" | "leverage_verb"; match: string };

function scanString(path: string, s: string, out: VoiceViolation[]) {
  const low = s.toLowerCase();
  for (const w of BANNED_WORDS) if (low.includes(w)) out.push({ path, kind: "banned_word", match: w });
  for (const c of BANNED_CTAS) if (low.includes(c)) out.push({ path, kind: "banned_cta", match: c });
  const lv = s.match(LEVERAGE_VERB);
  if (lv) out.push({ path, kind: "leverage_verb", match: lv[0] });
}

// Walk any JSON value and validate every string — EXCEPT verbatim client
// quotes (their copy is evidence, not our voice) at known evidence paths.
const EXEMPT = [/evidence_quote$/, /rewrite\.before$/, /\.evidence$/];

export function validateVoice(value: unknown, path = "report"): VoiceViolation[] {
  const out: VoiceViolation[] = [];
  const walk = (v: unknown, p: string) => {
    if (typeof v === "string") {
      if (!EXEMPT.some((rx) => rx.test(p))) scanString(p, v, out);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => walk(x, `${p}.${k}`));
  };
  walk(value, path);
  return out;
}

// Structural check of the agent's report JSON against the blueprint §7
// contract. Hand-rolled (no zod dep): returns human-readable problems.
export function validateReportShape(r: Record<string, unknown> | null | undefined): string[] {
  const probs: string[] = [];
  const need = (cond: boolean, msg: string) => { if (!cond) probs.push(msg); };
  if (!r || typeof r !== "object") return ["report is not an object"];
  const snap = r.snapshot as Record<string, unknown> | undefined;
  need(!!snap, "missing snapshot");
  if (snap) {
    const score = snap.authority_score as Record<string, unknown> | undefined;
    need(!!score && typeof score.value === "number" && (score.value as number) >= 0 && (score.value as number) <= 100, "authority_score.value must be 0-100");
    need(Array.isArray(score?.factors) && (score!.factors as unknown[]).length === 5, "authority_score.factors must have 5 entries");
    need(Array.isArray(snap.cards) && (snap.cards as unknown[]).length >= 3, "snapshot.cards must have >= 3 scorecards");
    need(typeof snap.verdict_line === "string" && (snap.verdict_line as string).length > 0, "missing verdict_line");
  }
  const numbers = r.numbers as Record<string, unknown> | undefined;
  need(!!numbers && Array.isArray(numbers.rows) && (numbers.rows as unknown[]).length >= 4, "numbers.rows must have >= 4 rows");
  need(typeof numbers?.diagnosis === "string" && (numbers!.diagnosis as string).length > 50, "numbers.diagnosis too thin");
  const gap = r.gap as Record<string, unknown> | undefined;
  need(!!gap && Array.isArray(gap.items) && (gap.items as unknown[]).length >= 3 && (gap.items as unknown[]).length <= 5, "gap.items must have 3-5 entries");
  const fix = r.fix as Record<string, unknown> | undefined;
  need(!!fix && Array.isArray(fix.items) && (fix.items as unknown[]).length >= 3 && (fix.items as unknown[]).length <= 5, "fix.items must have 3-5 entries");
  if (fix && Array.isArray(fix.items) && (fix.items as { biggest_lever?: boolean }[]).filter((f) => f.biggest_lever).length !== 1) probs.push("exactly one fix must be biggest_lever");
  const rewrite = (fix?.rewrite || {}) as Record<string, unknown>;
  need(typeof rewrite.before === "string" && typeof rewrite.after === "string", "fix.rewrite needs before + after");
  need(!!r.math, "missing math section");
  const next = r.next as Record<string, unknown> | undefined;
  need(typeof next?.cta === "string" && (next!.cta as string).length > 0, "missing next.cta");
  return probs;
}
