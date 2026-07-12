// Authority Diagnostic — metric engine (the ONLY place ratios are computed).
// Spec: docs/authority-diagnostic/scoring-engine.md §1–§3.
// Raw inputs are client-entered counts/dollars; every ratio guards its
// denominator; missing inputs stay null (named data gaps, never zeros).

export type RawMetrics = {
  spend?: number | null;        // dollars
  impressions?: number | null;
  reach?: number | null;
  plays_3s?: number | null;
  views_50?: number | null;
  link_clicks?: number | null;
  clicks_all?: number | null;
  leads?: number | null;
};

export type ComputedMetrics = {
  cpl: number | null;
  hook_rate: number | null;
  hold_rate: number | null;
  efficiency: number | null;    // leads ÷ 3-sec plays
  link_ctr: number | null;
  ctr_all: number | null;
  optin: number | null;
  cpc_link: number | null;
  cpc_all: number | null;
  cpm: number | null;
  frequency: number | null;
};

const n = (v: unknown): number | null => {
  const x = typeof v === "string" ? parseFloat(v.replace(/[$,\s]/g, "")) : Number(v);
  return v == null || v === "" || !isFinite(x) ? null : x;
};
const div = (a: number | null, b: number | null): number | null =>
  a == null || b == null || b === 0 ? null : a / b;

export function computeDerived(rawIn: RawMetrics): ComputedMetrics {
  const r = {
    spend: n(rawIn.spend), impressions: n(rawIn.impressions), reach: n(rawIn.reach),
    plays_3s: n(rawIn.plays_3s), views_50: n(rawIn.views_50),
    link_clicks: n(rawIn.link_clicks), clicks_all: n(rawIn.clicks_all), leads: n(rawIn.leads),
  };
  return {
    cpl: div(r.spend, r.leads),
    hook_rate: div(r.plays_3s, r.impressions),
    hold_rate: div(r.views_50, r.impressions),
    efficiency: div(r.leads, r.plays_3s),
    link_ctr: div(r.link_clicks, r.impressions),
    ctr_all: div(r.clicks_all, r.impressions),
    optin: div(r.leads, r.link_clicks),
    cpc_link: div(r.spend, r.link_clicks),
    cpc_all: div(r.spend, r.clicks_all),
    cpm: r.spend != null && r.impressions ? (r.spend / r.impressions) * 1000 : null,
    frequency: div(r.impressions, r.reach),
  };
}

// Soft validation — warn, never block (surface to admin as intake anomalies).
export function findAnomalies(rawIn: RawMetrics): string[] {
  const r = computeDerivedInputs(rawIn);
  const out: string[] = [];
  if (r.plays_3s != null && r.impressions != null && r.plays_3s > r.impressions) out.push("3-sec plays exceed impressions");
  if (r.leads != null && r.link_clicks != null && r.leads > r.link_clicks) out.push("leads exceed link clicks");
  if (r.reach != null && r.impressions != null && r.reach > r.impressions) out.push("reach exceeds impressions");
  if (r.link_clicks != null && r.clicks_all != null && r.link_clicks > r.clicks_all) out.push("link clicks exceed total clicks");
  return out;
}
function computeDerivedInputs(rawIn: RawMetrics) {
  return {
    spend: n(rawIn.spend), impressions: n(rawIn.impressions), reach: n(rawIn.reach),
    plays_3s: n(rawIn.plays_3s), views_50: n(rawIn.views_50),
    link_clicks: n(rawIn.link_clicks), clicks_all: n(rawIn.clicks_all), leads: n(rawIn.leads),
  };
}

// ---- Benchmark ratings -------------------------------------------------------
// thresholds jsonb: { metric: { band: [min,max] } } — null edge = open. An
// industry config overrides per-metric and FALLS THROUGH to default for the rest.
type Thresholds = Record<string, Record<string, (number | null)[] | string>>;

export function rateMetrics(
  computed: ComputedMetrics,
  thresholds: Thresholds,
  defaults: Thresholds
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  (Object.keys(computed) as (keyof ComputedMetrics)[]).forEach((m) => {
    const v = computed[m];
    if (v == null) { out[m] = null; return; }
    const bands = thresholds[m] || defaults[m];
    if (!bands) { out[m] = null; return; }
    out[m] = null;
    for (const [band, range] of Object.entries(bands)) {
      if (!Array.isArray(range)) continue; // skip *_note keys
      const [lo, hi] = range;
      if ((lo == null || v >= lo) && (hi == null || v <= hi)) { out[m] = band; break; }
    }
  });
  return out;
}

// ---- The two matrices (scoring-engine.md §3) ----------------------------------
const M1: Record<string, string> = {
  great_hook__great_efficiency: "Scale hard. Don't touch.",
  great_hook__okay_efficiency: "Hook loved, drop-off after. Fix CTA + form friction.",
  great_hook__bad_efficiency: "Hook attracts unqualified people. Refine targeting/qualification.",
  okay_hook__great_efficiency: "Small hook tweaks toward 20% without breaking efficiency.",
  okay_hook__okay_efficiency: "SWEET SPOT — don't break it.",
  okay_hook__bad_efficiency: "No engagement, no conversion. Rework hook AND CTA.",
  bad_hook__great_efficiency: "Engagement, no action — wrong audience. Tweak audience + messaging.",
  bad_hook__okay_efficiency: "Audience doesn't resonate; pain points missing.",
  bad_hook__bad_efficiency: "Kill. Restart with new creative.",
};
const M2: Record<string, string> = {
  great_all__great_link: "Ideal — scale.",
  great_all__okay_link: "Engagement strong, link CTA weak. Stronger CTA.",
  great_all__bad_link: "Engagement bait, no intent. Strip fluff, direct CTA.",
  okay_all__great_link: "Direct-response winner.",
  okay_all__okay_link: "Balanced, underperforming. New hooks + urgency.",
  okay_all__bad_link: "Blending into feed. New creative — colors, hook, motion.",
  bad_all__great_link: "Hidden winner — niche + qualified. Check lead quality before touching.",
  bad_all__okay_link: "Weak ad. Rework first 3 seconds + CTA.",
  bad_all__bad_link: "Kill. Start fresh.",
};

export type MatrixResult = {
  matrix_1: string | null;
  matrix_1_read: string | null;
  matrix_2: string | null;
  matrix_2_read: string | null;
  freq_override: boolean;
  action: "scale" | "tweak" | "refresh" | "kill" | "insufficient_data";
};

const ACTION_M1: Record<string, MatrixResult["action"]> = {
  great_hook__great_efficiency: "scale",
  great_hook__okay_efficiency: "tweak",
  great_hook__bad_efficiency: "tweak",
  okay_hook__great_efficiency: "tweak",
  okay_hook__okay_efficiency: "scale",       // sweet spot: protect, don't operate
  okay_hook__bad_efficiency: "refresh",      // rework hook AND CTA
  bad_hook__great_efficiency: "tweak",
  bad_hook__okay_efficiency: "tweak",
  bad_hook__bad_efficiency: "kill",
};

export function placeMatrices(c: ComputedMetrics, isRetargeting: string | null | undefined): MatrixResult {
  // insufficient data: can't even read the account
  if (c.cpl == null && c.hook_rate == null && c.link_ctr == null) {
    return { matrix_1: null, matrix_1_read: null, matrix_2: null, matrix_2_read: null, freq_override: false, action: "insufficient_data" };
  }
  let m1: string | null = null;
  if (c.hook_rate != null && c.efficiency != null) {
    const hook = c.hook_rate >= 0.2 ? "great" : c.hook_rate >= 0.1 ? "okay" : "bad";
    const eff = c.efficiency >= 0.5 ? "great" : c.efficiency >= 0.4 ? "okay" : "bad";
    m1 = `${hook}_hook__${eff}_efficiency`;
  }
  let m2: string | null = null;
  if (c.link_ctr != null && c.ctr_all != null) {
    const link = c.link_ctr >= 0.01 ? "great" : c.link_ctr >= 0.007 ? "okay" : "bad";
    const all = c.ctr_all >= 0.02 ? "great" : c.ctr_all >= 0.01 ? "okay" : "bad";
    m2 = `${all}_all__${link}_link`;
  }
  // Frequency ≥3 fires an automatic creative refresh — unless retargeting.
  const freq_override = c.frequency != null && c.frequency >= 3 && isRetargeting !== "yes";
  let action: MatrixResult["action"] = m1 ? ACTION_M1[m1] : m2?.includes("bad_all__bad_link") ? "kill" : "tweak";
  if (freq_override && action !== "kill") action = "refresh";
  return {
    matrix_1: m1, matrix_1_read: m1 ? M1[m1] : null,
    matrix_2: m2, matrix_2_read: m2 ? M2[m2] : null,
    freq_override, action,
  };
}

// ---- Projection math (scoring-engine.md §6 — conservative, assumptions stated)
export type Projection = {
  skipped: boolean;
  reason?: string;
  projected_hook_rate?: number;
  uplift?: number;
  leads_low?: number;
  leads_high?: number;
  cpl_low?: number;   // best case (most leads)
  cpl_high?: number;  // worst case
};

export function projectFix(c: ComputedMetrics, rawLeads: number | null, spend: number | null, cfg?: { target_hook_rate?: number; relief_bonus?: number; cap_multiple?: number }): Projection {
  const target = cfg?.target_hook_rate ?? 0.27;
  const bonus = cfg?.relief_bonus ?? 1.15;
  const cap = cfg?.cap_multiple ?? 2.5;
  if (c.hook_rate == null || rawLeads == null || spend == null) return { skipped: true, reason: "missing hook rate, leads, or spend" };
  if (c.hook_rate >= target) return { skipped: true, reason: "hook rate already at or above target — diagnose the real leak instead" };
  // clamp(target, current+0.05 … 0.27) per scoring-engine.md §6
  const projected = Math.min(Math.max(target, c.hook_rate + 0.05), 0.27);
  const uplift = projected / c.hook_rate;
  const low = rawLeads * uplift;
  const high = Math.min(rawLeads * uplift * bonus, rawLeads * cap);
  return {
    skipped: false,
    projected_hook_rate: projected,
    uplift,
    leads_low: Math.round(low),
    leads_high: Math.round(high),
    cpl_low: spend / high,
    cpl_high: spend / low,
  };
}
