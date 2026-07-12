// Authority Diagnostic — metric engine fixture test (Summit Comfort).
// Expected per docs/authority-diagnostic/README.md step 2:
//   spend 3000, leads 21 -> CPL 142.86 · hook 16% (fair) · link CTR 0.6% ·
//   frequency 4.2 -> override TRUE · matrix okay_hook__bad_efficiency ·
//   action REFRESH · opt-in 22%.
// Run: node scripts/test-diagnostic-metrics.mjs   (after npx tsc compile-free via tsx)
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Transpile the TS engine on the fly with esbuild (already a Next dependency).
const dir = mkdtempSync(join(tmpdir(), "dx-test-"));
execSync(`npx esbuild lib/diagnostic/metrics.ts --bundle --format=esm --outfile="${join(dir, "metrics.mjs")}"`, { stdio: "inherit" });
const { computeDerived, rateMetrics, placeMatrices, projectFix, findAnomalies } = await import("file://" + join(dir, "metrics.mjs"));

// Summit Comfort raw fixture — derived to hit the spec's target ratios:
// impressions 15,909 -> plays 2,545 (16.0% hook), link clicks 95 (0.6% CTR),
// leads 21 (22.1% opt-in), reach 3,788 (freq 4.2), spend $3,000.
const raw = {
  spend: 3000, impressions: 15909, reach: 3788, plays_3s: 2545,
  views_50: 1432, link_clicks: 95, clicks_all: 205, leads: 21,
};

const c = computeDerived(raw);
const approx = (a, b, tol = 0.01) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
let fails = 0;
const check = (name, ok, got) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${JSON.stringify(got)})`); if (!ok) fails++; };

check("CPL ≈ 142.86", approx(c.cpl, 142.857), c.cpl?.toFixed(2));
check("hook_rate ≈ 0.16", approx(c.hook_rate, 0.16, 0.02), c.hook_rate?.toFixed(4));
check("link_ctr ≈ 0.006", approx(c.link_ctr, 0.006, 0.02), c.link_ctr?.toFixed(4));
check("optin ≈ 0.22", approx(c.optin, 0.221, 0.02), c.optin?.toFixed(3));
check("frequency ≈ 4.2", approx(c.frequency, 4.2, 0.01), c.frequency?.toFixed(2));
check("efficiency < 0.2 (poor)", c.efficiency < 0.2, c.efficiency?.toFixed(4));

const defaults = {
  cpl: { excellent: [0, 30], good: [31, 50], fair: [51, 80], bad: [81, null] },
  efficiency: { exceptional: [0.5, null], sweet: [0.4, 0.49], good: [0.3, 0.39], fair: [0.2, 0.29], poor: [null, 0.2] },
  hook_rate: { excellent: [0.3, null], good: [0.2, 0.29], fair: [0.1, 0.19], poor: [null, 0.1] },
  link_ctr: { excellent: [0.012, null], good: [0.008, 0.0119], fair: [0.005, 0.0079], poor: [null, 0.005] },
  ctr_all: { excellent: [0.025, null], good: [0.015, 0.0249], fair: [0.01, 0.0149], poor: [null, 0.01] },
  optin: { excellent: [0.2, null], good: [0.1, 0.19], fair: [0.05, 0.09], poor: [null, 0.05] },
  cpm: { excellent: [0, 10], good: [10, 20], fair: [20, 40], poor: [40, null] },
  frequency: { optimal: [1, 2], caution: [2, 3], high_risk: [3, 5], fatigue: [5, null] },
};
const ratings = rateMetrics(c, defaults, defaults);
check("hook rated fair", ratings.hook_rate === "fair", ratings.hook_rate);
check("efficiency rated poor", ratings.efficiency === "poor", ratings.efficiency);
check("CPL rated bad", ratings.cpl === "bad", ratings.cpl);
check("optin rated excellent", ratings.optin === "excellent", ratings.optin);
check("frequency rated high_risk", ratings.frequency === "high_risk", ratings.frequency);

const m = placeMatrices(c, "no");
check("matrix_1 = okay_hook__bad_efficiency", m.matrix_1 === "okay_hook__bad_efficiency", m.matrix_1);
check("freq override fires", m.freq_override === true, m.freq_override);
check("action = refresh", m.action === "refresh", m.action);

const mRetarget = placeMatrices(c, "yes");
check("retargeting exempts freq override", mRetarget.freq_override === false, mRetarget.freq_override);

const p = projectFix(c, 21, 3000, { target_hook_rate: 0.27, relief_bonus: 1.15, cap_multiple: 2.5 });
check("projection not skipped", !p.skipped, p.reason);
check("uplift ≈ 1.69", approx(p.uplift, 0.27 / c.hook_rate, 0.01), p.uplift?.toFixed(2));
check("leads range ≈ 35–41", p.leads_low >= 34 && p.leads_low <= 37 && p.leads_high >= 39 && p.leads_high <= 42, [p.leads_low, p.leads_high]);
check("CPL range ≈ $73–$85", p.cpl_low > 70 && p.cpl_low < 78 && p.cpl_high > 80 && p.cpl_high < 88, [p.cpl_low?.toFixed(0), p.cpl_high?.toFixed(0)]);

// null-safety: missing video fields must yield nulls + insufficient-data handling
const noVideo = computeDerived({ spend: 1000, impressions: 50000, reach: 30000, link_clicks: 400, leads: 20 });
check("no video -> hook_rate null", noVideo.hook_rate === null, noVideo.hook_rate);
const mNoVideo = placeMatrices(noVideo, "no");
check("no video -> matrix_1 null, still acts", mNoVideo.matrix_1 === null && mNoVideo.action !== "insufficient_data", [mNoVideo.matrix_1, mNoVideo.action]);
const empty = placeMatrices(computeDerived({}), "no");
check("empty -> insufficient_data", empty.action === "insufficient_data", empty.action);
check("anomaly: leads > link clicks", findAnomalies({ leads: 50, link_clicks: 10 }).length === 1, findAnomalies({ leads: 50, link_clicks: 10 }));

rmSync(dir, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILURES` : "\nALL PASS — engine matches the Summit Comfort fixture");
process.exit(fails ? 1 : 0);
