// Spreadsheet rows -> Spotlight prospect rows. Pure: no DOM, no I/O, so the
// browser importer (app/cockpit/SheetImport.jsx) and EDITH (a sheet attached in
// her chat, imported server-side) read a sheet exactly the same way.

export type Cell = string;
export type Grid = Cell[][];

// Every field a column can map to. The key is what buildRows reads.
export const FIELDS: Array<[string, string]> = [
  ["", "— skip this column —"], ["business", "Business *"], ["owner_name", "Owner / contact name"], ["first_name", "First name"], ["last_name", "Last name"],
  ["email", "Email"], ["phone", "Phone"], ["website", "Website"], ["source_url", "Where it was found (URL)"], ["suburb", "Neighborhood / city"], ["vertical", "Vertical / industry"],
  ["reviews", "Google reviews"], ["years", "Years in business"], ["founded", "Year founded"], ["specific_detail", "Specific detail (EDITH 1-1 opener)"],
  ["email_status", "Email status / check"], ["notes", "Notes"],
];

// [field, exact header, loose header]. Order matters: the first field to claim
// a column keeps it ("Email" wins over "Email Status" for the email field).
const GUESS: Array<[string, RegExp, RegExp | null]> = [
  ["business", /^(business|company|business name|company name|account|account name|organi[sz]ation|name of business|store|brand|prospect|prospect name|lead|lead name)$/i, /business|company|organi[sz]ation|prospect/i],
  ["email", /^e-?mail( address)?$/i, /^e-?mail(?!.*(status|check|found|verified|note))/i],
  ["phone", /^(phone|phone number|mobile|cell|telephone|tel)$/i, /phone|mobile|cell\b/i],
  ["website", /^(website|web|url|site|domain|web site|homepage)$/i, /website|domain|homepage/i],
  ["source_url", /^(source url|source link|found at|link|listing|listing url)$/i, /source ?(url|link)|found at/i],
  ["first_name", /^first( name)?$/i, /^first/i],
  ["last_name", /^(last|surname)( name)?$/i, /^last|surname/i],
  ["owner_name", /^(owner|owner name|contact|contact name|full name|name|decision maker)$/i, /owner|contact name|full name/i],
  ["suburb", /^(suburb|neighbou?rhood|area|city|town|location)$/i, /suburb|neighbou?rhood|city\b|area\b/i],
  ["vertical", /^(vertical|industry|category|niche|type|business type)$/i, /industry|vertical|category|niche/i],
  ["reviews", /^(reviews?|google reviews|review count|# ?reviews|number of reviews)$/i, /reviews?\b/i],
  ["founded", /^(founded|year founded|established|since|est\.?)$/i, /founded|established/i],
  ["years", /^(years|years in business|yrs)$/i, /years/i],
  ["specific_detail", /^(specific detail|detail|hook|opener|personali[sz]ation|first line|icebreaker)$/i, /specific.?detail|personali[sz]|icebreaker|opener/i],
  ["email_status", /^(email status|email check|email found|email verified|status)$/i, /e-?mail.*(status|check|found|verified)/i],
  ["notes", /^(notes?|comments?|description)$/i, /notes?\b|comment/i],
];

export function guessMapping(headers: Cell[]): string[] {
  const map = headers.map(() => "");
  const used = new Set<string>();
  for (const pass of [1, 2]) {
    for (const [field, exact, loose] of GUESS) {
      if (used.has(field)) continue;
      const i = headers.findIndex((h, j) => !map[j] && (pass === 1 ? exact.test(String(h).trim()) : !!loose && loose.test(String(h).trim())));
      if (i >= 0) { map[i] = field; used.add(field); }
    }
  }
  return map;
}

// The header row is the one that reads most like column names — not always
// row 1 (a title and a totals row often sit above it).
export function headerRowIndex(rows: Grid): number {
  let best = -1, bestScore = 1;
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const cells = rows[i].map((c) => String(c || "").trim());
    if (cells.filter(Boolean).length < 2) continue;
    const score = guessMapping(cells).filter(Boolean).length;
    if (score > bestScore) { best = i; bestScore = score; }
  }
  if (best >= 0) return best;
  const firstFull = rows.findIndex((r) => r.filter((c) => String(c || "").trim()).length >= 2);
  return firstFull < 0 ? 0 : firstFull;
}

// A vertical from the business name, when the sheet has no industry column.
// Ordered: "Kitchen & Bath" is a remodeler before it's a restaurant.
const FROM_NAME: Array<[string, RegExp]> = [
  ["law", /\blaw\b|attorney|lawyers?\b|legal\b/i],
  ["insurance", /insur/i],
  ["medspa", /med ?spa|aesthetic|botox|skin ?care|wellness/i],
  ["pest", /pest|extermin|termite|mosquito/i],
  ["roofing", /roof/i],
  ["hvac", /hvac|heating|cooling|air cond|^air\b|furnace|plumb|electric|drain/i],
  ["landscaping", /landscap|lawn|hardscape|outdoor living|turf|tree service/i],
  ["builders", /builder|building group|construct|contractor|remodel|renovat|custom homes|\bhomes\b|kitchen ?(&|and) ?bath|\btile\b/i],
  ["auto", /\bauto|motor|car tech|mechanic|\btires?\b|collision|brake|alignment|body shop/i],
  ["local", /restaurant|cafe|coffee|grill|pizza|bbq|\bfood\b|salon|barber|fade|cut ?& ?shave|\bgym\b|crossfit|fitness|martial|jiu|dojo|yoga|combat/i],
];
const FROM_INDUSTRY: Array<[string, RegExp]> = [
  ["hvac", /hvac|heating|cooling|air cond|furnace|plumb|electric/i], ["roofing", /roof/i], ["pest", /pest|extermin|termite/i],
  ["landscaping", /landscap|lawn|hardscape|yard|tree/i], ["builders", /build|construct|contractor|remodel|renovat/i],
  ["auto", /auto|car\b|mechanic|tire|collision|body shop/i], ["medspa", /med ?spa|aesthetic|botox|skin|spa\b/i],
  ["law", /law|attorney|legal/i], ["insurance", /insur/i], ["local", /restaurant|salon|barber|gym|fitness|cafe|food/i],
];
export function toVertical(v: string, verticals: Record<string, unknown>): string {
  const s = String(v || "").trim();
  if (!s) return "";
  if (verticals[s.toLowerCase()]) return s.toLowerCase();
  const hit = FROM_INDUSTRY.find(([k, re]) => verticals[k] && re.test(s));
  return hit ? hit[0] : "";
}
export function verticalFromName(name: string, verticals: Record<string, unknown>): string {
  const hit = FROM_NAME.find(([k, re]) => verticals[k] && re.test(String(name || "")));
  return hit ? hit[0] : "";
}

// Listing sites, not the business's own site: a URL from one of these is kept
// as "found at" in the notes and never becomes their website.
const DIRECTORY = /(^|\.)(bbb\.org|tripadvisor\.|houzz\.|nextdoor\.|yelp\.|facebook\.|instagram\.|linkedin\.|google\.|iexitapp\.|autorepairup\.|allbiz\.|cityof\.com|storeboard\.|slideserve\.|mycharlottelife\.|beyondthenest\.|bringfido\.|threebestrated\.|frankbetzhouseplans\.|iglobal\.|southernfoodways\.|roofingdirect\.|inspectexpress\.|angi\.|homeadvisor\.|thumbtack\.|yellowpages\.|manta\.|mapquest\.|wordpress\.com|home\.blog|blogspot\.)/i;
const GENERIC = new Set(["the", "and", "inc", "llc", "pllc", "pc", "co", "company", "services", "service", "group", "charlotte", "carolina", "southeast", "south", "north", "associates", "solutions", "management", "insurance", "agency", "center", "studio", "firm", "law", "home", "homes", "custom", "residential"]);

// The business's own site, if the "found at" URL is one: its host carries a
// word from the business name or matches the email's domain.
export function ownSite(url: string, business: string, email: string): string {
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(url) ? url : "https://" + url); } catch { return ""; }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (DIRECTORY.test(host)) return "";
  const mailDomain = String(email || "").toLowerCase().split("@")[1] || "";
  const words = String(business || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !GENERIC.has(w));
  const hostBare = host.replace(/[^a-z0-9]/g, "");
  if ((mailDomain && (host === mailDomain || host.endsWith("." + mailDomain))) || words.some((w) => hostBare.includes(w))) return `${u.protocol}//${u.hostname}`;
  return "";
}

export type ProspectRow = {
  business: string; owner_name: string; email: string; phone: string; website: string; suburb: string; vertical: string;
  reviews: number | ""; years: number | ""; specific_detail: string; notes: string;
  vertical_guessed?: boolean;
  hold?: string; // why this row must not be cold-emailed until a human checks it
};

const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

export function buildRows(body: Grid, map: string[], verticals: Record<string, unknown>): ProspectRow[] {
  const year = new Date().getFullYear();
  const hasVerticalCol = map.includes("vertical");
  return body.map((r) => {
    const o: Record<string, string> = {};
    map.forEach((f, i) => { if (f) { const v = String(r[i] ?? "").trim(); if (v) o[f] = o[f] ? o[f] + " " + v : v; } });
    const owner = o.owner_name || [o.first_name, o.last_name].filter(Boolean).join(" ");
    const digits = (x: string | undefined) => { const m = String(x || "").replace(/,/g, "").match(/\d+/); return m ? Number(m[0]) : null; };
    let years = digits(o.years);
    const founded = digits(o.founded);
    if (years == null && founded && founded > 1800 && founded <= year) years = year - founded;
    if (years != null && years > 1800 && years <= year) years = year - years; // a founding year typed into "years"
    const email = (o.email || "").toLowerCase().replace(/^mailto:/, "").trim();
    const business = o.business || "";
    let vertical = toVertical(o.vertical, verticals);
    let guessed = false;
    if (!vertical && !hasVerticalCol && business) { vertical = verticalFromName(business, verticals); guessed = !!vertical; }
    const site = o.website || (o.source_url ? ownSite(o.source_url, business, email) : "");
    const status = String(o.email_status || "").trim();
    const notes = [
      o.notes,
      o.vertical && !toVertical(o.vertical, verticals) ? `Industry: ${o.vertical}` : "",
      status && !/^(found|verified|valid|ok|yes)\.?$/i.test(status) ? `Email: ${status}` : "",
      o.source_url ? `Found at: ${o.source_url}` : "",
    ].filter(Boolean).join(" · ");
    const flagged = [o.notes, status].filter(Boolean).find((s) => /\bverif(y|ication)\b|double.?check|not confirmed/i.test(s));
    return {
      business, owner_name: owner || "", email: EMAIL_OK.test(email) ? email : "", phone: o.phone || "", website: site,
      suburb: o.suburb || "", vertical, reviews: digits(o.reviews) ?? "", years: years ?? "",
      specific_detail: o.specific_detail || "", notes,
      ...(guessed ? { vertical_guessed: true } : {}),
      ...(flagged ? { hold: `the sheet says: “${flagged.slice(0, 160)}”` } : {}),
    };
  });
}

// One call for a whole grid: find the header row, guess the columns, build rows.
export function readGrid(rows: Grid, verticals: Record<string, unknown>, mapOverride?: string[]) {
  const h = headerRowIndex(rows);
  const headers = (rows[h] || []).map((c) => String(c || "").trim());
  const body = rows.slice(h + 1).filter((r) => r.some((c) => String(c || "").trim()));
  const map = mapOverride && mapOverride.length === headers.length ? mapOverride : guessMapping(headers);
  return { headerRow: h, headers, map, body, rows: buildRows(body, map, verticals) };
}
