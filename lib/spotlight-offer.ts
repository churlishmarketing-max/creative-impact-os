// The Charlotte Spotlight offer — one place, read by the board page, invoices,
// the agreement, and EDITH's emails. Source: Charlotte_Spotlight_Invoice_Template
// (Aug 21 2026, "The Price Board"), confirmed by Brandon on 2026-09-29 as the
// correct pricing (NOT the Sep 19 script's flat $997 = $250 + $747).
//
//   Ten positions, two tiers, paid in full at booking — the spot is assigned
//   the moment payment clears. Feature spots 1–4 get two videos; Community
//   spots 5–10 get a produced segment. One founding season with a floor.
//
// No imports on purpose: server code, the EDITH engine's callers, and the
// public board all use it. Prices are overridable in Spotlight → Settings.

export const DEFAULT_PRICES = [1750, 1500, 1500, 1200, 1000, 950, 950, 950, 750, 750];
export const DEFAULT_FEATURE_SPOTS = 4;
export const DEFAULT_FLOOR_DATE = "October 10, 2026";

export type Tier = "Feature" | "Community";

export const money = (n: number) => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

export function spotTier(n: number, featureSpots = DEFAULT_FEATURE_SPOTS): Tier {
  return n >= 1 && n <= featureSpots ? "Feature" : "Community";
}
export function spotPrice(prices: number[] | undefined, n: number): number | null {
  const list = prices && prices.length ? prices : DEFAULT_PRICES;
  const v = Number(list[n - 1]);
  return n >= 1 && n <= list.length && v > 0 ? v : null;
}
// Invoice title, verbatim from the price board ("… Feature Spot 1 (Lead Position)").
export function spotTitle(n: number, featureSpots = DEFAULT_FEATURE_SPOTS) {
  return `Charlotte Spotlight — ${spotTier(n, featureSpots)} Spot ${n}${n === 1 ? " (Lead Position)" : ""}`;
}

// What each tier includes — the invoice scope blocks, verbatim.
export const SCOPE: Record<Tier, string[]> = {
  Feature: [
    "Dedicated one-minute commercial: filmed on location, owner interview, produced and delivered as your own standalone ad — included",
    "Episode feature segment (20–25 seconds, with interview) in the Charlotte Spotlight episode — included",
    "One promoted-distribution week for your dedicated video on Meta, media cost covered — included",
    "Season promotion month: the episode campaign putting the season in front of the city — included",
    "Full marketing license: run your videos anywhere, paid ads included, forever — included",
    "One revision round on your cuts within the approval window — included",
    "Post-season Feature Debrief: your real campaign numbers and what to run next — included",
  ],
  Community: [
    "Produced segment (15–20 seconds) in the Charlotte Spotlight episode, filmed on location — included",
    "Your segment delivered as a standalone cut: your own runnable ad — included",
    "Season promotion month: the episode campaign putting the season in front of the city — included",
    "Full marketing license: run your video anywhere, paid ads included, forever — included",
    "One revision round on your cut within the approval window — included",
    "Post-season Feature Debrief: your real campaign numbers and what to run next — included",
  ],
};

// The invoice's payment-terms block, verbatim (floor date from settings).
export function paymentTerms(floorDate = DEFAULT_FLOOR_DATE) {
  return `Payment in full is due at booking; your spot is assigned and comes off the public board the moment payment clears. Your film date is set with you at booking. If fewer than three businesses are filmed by ${floorDate}, the season episode will not assemble and the Agreement’s rollover-or-refund terms apply — your money is never stranded against an undelivered season. Once your film date is calendared, payments are otherwise non-refundable; before your film date, your spot may be transferred to another business with written notice. Full terms in the Charlotte Spotlight Agreement accompanying this invoice.`;
}

// The season floor, per the Agreement §6 — it differs by tier: Community
// buyers choose roll-or-refund; Feature buyers keep their dedicated video and
// promoted week, and their segment rolls into the next season. Written to
// follow "if" in a sentence ("…the safety line: {{floor_line}}").
export function floorLine(tier: Tier, floorDate = DEFAULT_FLOOR_DATE) {
  return tier === "Community"
    ? `if fewer than three businesses are filmed by ${floorDate}, the season episode won't assemble — and you choose: roll your spot to the next season at the same position and price, or every dollar back within five business days.`
    : `if fewer than three businesses are filmed by ${floorDate}, the season episode won't assemble — you still get your one-minute commercial and your promoted week, and your episode segment is included in the next season's episode at no extra charge.`;
}
