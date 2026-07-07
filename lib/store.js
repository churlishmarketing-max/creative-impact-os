// ============================================================================
// Data layer for Creative Impact OS.
// Replaces the mockup's window.storage / localStorage blob.
//   - When Supabase is configured -> SupabaseStore: real, synced, per-user.
//   - When it isn't (local dev)    -> LocalStore: mirrors the old localStorage
//     behavior so the design stays runnable. Deals/log are in-memory only here;
//     real persistence is the Supabase path (that's the Stage-1 requirement).
// All money crosses this boundary in DOLLARS (the logic class speaks dollars);
// Supabase stores integer CENTS.
// ============================================================================
import { getBrowserClient, supabaseConfigured } from "./supabase/client";

const c2d = (cents) => (cents == null ? 0 : cents / 100);
const d2c = (dollars) => Math.round((+dollars || 0) * 100);
const hhmm = (iso) => {
  try {
    const d = new Date(iso);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  } catch {
    return "";
  }
};

class SupabaseStore {
  enabled = true;
  _uid = null;

  async _uidOnce() {
    if (this._uid) return this._uid;
    const sb = getBrowserClient();
    const { data } = await sb.auth.getUser();
    this._uid = data?.user?.id || null;
    return this._uid;
  }

  async loadAll() {
    const sb = getBrowserClient();
    await this._uidOnce();
    const [sprintR, dealsR, weeksR, appR, logR, clientsR, invoicesR, proposalsR, bookingsR, expensesR, kpisR, kpiEntriesR] = await Promise.all([
      sb.from("sprint").select("*").maybeSingle(),
      sb.from("deals").select("*").order("created_at", { ascending: true }),
      sb.from("weeks").select("*"),
      sb.from("app_state").select("*").maybeSingle(),
      sb.from("log_entries").select("*").order("created_at", { ascending: true }),
      sb.from("clients").select("*").order("created_at", { ascending: true }),
      sb.from("invoices").select("*").order("created_at", { ascending: false }),
      sb.from("proposals").select("*").order("created_at", { ascending: false }),
      sb.from("bookings").select("*").eq("status", "booked").order("start_at", { ascending: true }),
      sb.from("expenses").select("*").order("spent_on", { ascending: false }),
      sb.from("kpis").select("*").order("sort", { ascending: true }),
      sb.from("kpi_entries").select("*"),
    ]);

    const sprint = sprintR.data
      ? { target: c2d(sprintR.data.target_cents), sellby: sprintR.data.sellby_date, deadline: sprintR.data.deadline_date, oneThingTitle: sprintR.data.one_thing_title || "", oneThingBody: sprintR.data.one_thing_body || "" }
      : null;

    const deals = (dealsR.data || []).map((r) => ({
      id: r.id,
      name: r.name,
      offer: r.offer,
      value: c2d(r.value_cents),
      stage: r.stage,
      date: r.expected_date || undefined,
      clientId: r.client_id || null,
    }));

    const clients = (clientsR.data || []).map((r) => ({
      id: r.id,
      name: r.name,
      contact: r.contact_name || "",
      email: r.email || "",
      phone: r.phone || "",
      industry: r.industry || "",
      status: r.status || "Lead",
      source: r.source || "",
      ladder: r.ladder || "",
      renewal: r.renewal_date || "",
      notes: r.notes || "",
    }));

    const invoices = (invoicesR.data || []).map((r) => ({
      id: r.id,
      clientId: r.client_id || null,
      number: r.number || "",
      title: r.title || "",
      items: Array.isArray(r.items) ? r.items : [],
      amount: c2d(r.amount_cents),
      status: r.status || "draft",
      due: r.due_date || "",
      notes: r.notes || "",
      token: r.token,
      paidAt: r.paid_at || null,
    }));

    const proposals = (proposalsR.data || []).map((r) => ({
      id: r.id,
      clientId: r.client_id || null,
      number: r.number || "",
      title: r.title || "",
      intro: r.intro || "",
      items: Array.isArray(r.items) ? r.items : [],
      amount: c2d(r.amount_cents),
      terms: r.terms || "",
      status: r.status || "draft",
      token: r.token,
      signer: r.signer_name || "",
      acceptedAt: r.accepted_at || null,
    }));

    const weeks = {};
    (weeksR.data || []).forEach((r) => {
      weeks[r.week_key] = {
        calls: r.calls,
        proposals: r.offers_out,
        signed: c2d(r.signed_cents),
        collected: c2d(r.collected_cents),
        founderFree: r.founder_free_pct == null ? "" : r.founder_free_pct,
        manual: r.manual || {},
      };
    });

    const app = appR.data
      ? {
          founder: appR.data.founder || {},
          habits: appR.data.habits || [],
          goals: appR.data.goals || [],
          ops: appR.data.ops || {},
        }
      : null;

    const log = (logR.data || []).map((r) => ({
      t: hhmm(r.created_at),
      tag: r.tag,
      color: r.color || "var(--muted)",
      msg: r.message,
    }));

    // Diagnostic (dev only): shows auth + row visibility in the browser console.
    if (process.env.NODE_ENV !== "production") console.info("[ci-os] load", {
      authedUser: this._uid || null,
      deals: deals.length,
      weeks: Object.keys(weeks).length,
      sprint: !!sprint,
      app: !!app,
      log: log.length,
      errors: {
        sprint: sprintR.error?.message,
        deals: dealsR.error?.message,
        weeks: weeksR.error?.message,
        app: appR.error?.message,
        log: logR.error?.message,
      },
    });

    const bookings = (bookingsR.data || []).map((r) => ({
      id: r.id,
      name: r.name || "",
      email: r.email || "",
      phone: r.phone || "",
      notes: r.notes || "",
      start: r.start_at,
      end: r.end_at,
    }));

    const expenses = (expensesR.data || []).map((r) => ({
      id: r.id,
      date: r.spent_on,
      vendor: r.vendor || "",
      category: r.category || "Other",
      amount: c2d(r.amount_cents),
      recurring: !!r.recurring,
      notes: r.notes || "",
    }));

    const kpis = (kpisR.data || []).map((r) => ({
      id: r.id,
      name: r.name,
      unit: r.unit || "#",
      target: r.target == null ? "" : +r.target,
      cadence: r.cadence || "weekly",
      sort: r.sort || 0,
    }));

    // entries keyed "kpiId|periodKey" -> value
    const kpiEntries = {};
    (kpiEntriesR.data || []).forEach((r) => { kpiEntries[r.kpi_id + "|" + r.period_key] = +r.value; });

    return { sprint, deals, weeks, app, log, clients, invoices, proposals, bookings, expenses, kpis, kpiEntries };
  }

  async saveWeek(weekKey, w) {
    const sb = getBrowserClient();
    const uid = await this._uidOnce();
    const { error } = await sb.from("weeks").upsert(
      {
        user_id: uid,
        week_key: weekKey,
        calls: +w.calls || 0,
        offers_out: +w.proposals || 0,
        signed_cents: d2c(w.signed),
        collected_cents: d2c(w.collected),
        founder_free_pct: w.founderFree === "" || w.founderFree == null ? null : +w.founderFree,
        manual: w.manual || {},
      },
      { onConflict: "user_id,week_key" }
    );
    if (error) throw new Error("saveWeek: " + error.message);
  }

  async saveApp(app) {
    const sb = getBrowserClient();
    const uid = await this._uidOnce();
    const { error } = await sb.from("app_state").upsert(
      {
        user_id: uid,
        founder: app.founder || {},
        habits: app.habits || [],
        goals: app.goals || [],
        ops: app.ops || {},
      },
      { onConflict: "user_id" }
    );
    if (error) throw new Error("saveApp: " + error.message);
  }

  async upsertDeal(deal) {
    const sb = getBrowserClient();
    const uid = await this._uidOnce();
    const row = {
      user_id: uid,
      name: deal.name || "",
      offer: deal.offer || "",
      value_cents: d2c(deal.value),
      stage: deal.stage || "Lead",
      expected_date: deal.date || null,
      client_id: deal.clientId || null,
    };
    if (deal.id) {
      const { error } = await sb.from("deals").update(row).eq("id", deal.id);
      if (error) throw new Error("updateDeal: " + error.message);
      return deal.id;
    }
    const { data, error } = await sb.from("deals").insert(row).select("id").single();
    if (error) throw new Error("insertDeal: " + error.message);
    return data?.id || null;
  }

  async deleteDeal(id) {
    const sb = getBrowserClient();
    const { error } = await sb.from("deals").delete().eq("id", id);
    if (error) throw new Error("deleteDeal: " + error.message);
  }

  // One-time client seed: insert the starting pipeline for this user and return
  // the rows (with real DB ids) so the app uses them directly.
  async seedDeals(seed) {
    const sb = getBrowserClient();
    const uid = await this._uidOnce();
    const rows = seed.map((d) => ({
      user_id: uid,
      name: d.name,
      offer: d.offer,
      value_cents: d2c(d.value),
      stage: d.stage,
      expected_date: d.date || null,
    }));
    const { data, error } = await sb.from("deals").insert(rows).select("*");
    if (error) throw new Error("seedDeals: " + error.message);
    return (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      offer: r.offer,
      value: c2d(r.value_cents),
      stage: r.stage,
      date: r.expected_date || undefined,
    }));
  }

  async addLog(entry) {
    const sb = getBrowserClient();
    const uid = await this._uidOnce();
    await sb.from("log_entries").insert({
      user_id: uid,
      tag: entry.tag || "EV",
      message: entry.msg || "",
      color: entry.color || null,
    });
  }

  async upsertClient(c) {
    const sb = getBrowserClient();
    const uid = await this._uidOnce();
    const row = {
      user_id: uid,
      name: c.name || "",
      contact_name: c.contact || null,
      email: c.email || null,
      phone: c.phone || null,
      industry: c.industry || null,
      status: c.status || "Lead",
      source: c.source || null,
      ladder: c.ladder || null,
      renewal_date: c.renewal || null,
      notes: c.notes || null,
    };
    if (c.id) {
      const { error } = await sb.from("clients").update(row).eq("id", c.id);
      if (error) throw new Error("updateClient: " + error.message);
      return c.id;
    }
    const { data, error } = await sb.from("clients").insert(row).select("id").single();
    if (error) throw new Error("insertClient: " + error.message);
    return data?.id || null;
  }

  async deleteClient(id) {
    const sb = getBrowserClient();
    const { error } = await sb.from("clients").delete().eq("id", id);
    if (error) throw new Error("deleteClient: " + error.message);
  }

  async upsertInvoice(inv) {
    const sb = getBrowserClient();
    const uid = await this._uidOnce();
    const items = (inv.items || []).map((it) => ({
      desc: it.desc || "",
      qty: +it.qty || 0,
      unit_cents: d2c(it.unit),
    }));
    const amount_cents = items.reduce((s, it) => s + it.qty * it.unit_cents, 0);
    const row = {
      user_id: uid,
      client_id: inv.clientId || null,
      number: inv.number || "",
      title: inv.title || "",
      items,
      amount_cents,
      status: inv.status || "draft",
      due_date: inv.due || null,
      notes: inv.notes || null,
    };
    if (inv.id) {
      const { error } = await sb.from("invoices").update(row).eq("id", inv.id);
      if (error) throw new Error("updateInvoice: " + error.message);
      return inv.id;
    }
    const { data, error } = await sb.from("invoices").insert(row).select("id, token").single();
    if (error) throw new Error("insertInvoice: " + error.message);
    return data; // { id, token }
  }

  async deleteInvoice(id) {
    const sb = getBrowserClient();
    const { error } = await sb.from("invoices").delete().eq("id", id);
    if (error) throw new Error("deleteInvoice: " + error.message);
  }

  async upsertProposal(p) {
    const sb = getBrowserClient();
    const uid = await this._uidOnce();
    const items = (p.items || []).map((it) => ({ desc: it.desc || "", qty: +it.qty || 0, unit_cents: d2c(it.unit) }));
    const amount_cents = items.reduce((s, it) => s + it.qty * it.unit_cents, 0);
    const row = {
      user_id: uid,
      client_id: p.clientId || null,
      number: p.number || "",
      title: p.title || "",
      intro: p.intro || null,
      items,
      amount_cents,
      terms: p.terms || null,
      status: p.status || "draft",
    };
    if (p.id) {
      const { error } = await sb.from("proposals").update(row).eq("id", p.id);
      if (error) throw new Error("updateProposal: " + error.message);
      return p.id;
    }
    const { data, error } = await sb.from("proposals").insert(row).select("id, token").single();
    if (error) throw new Error("insertProposal: " + error.message);
    return data; // { id, token }
  }

  async deleteProposal(id) {
    const sb = getBrowserClient();
    const { error } = await sb.from("proposals").delete().eq("id", id);
    if (error) throw new Error("deleteProposal: " + error.message);
  }

  async cancelBooking(id) {
    const sb = getBrowserClient();
    const { error } = await sb.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) throw new Error("cancelBooking: " + error.message);
  }

  async upsertExpense(x) {
    const sb = getBrowserClient();
    const uid = await this._uidOnce();
    const row = {
      user_id: uid,
      spent_on: x.date || new Date().toISOString().slice(0, 10),
      vendor: x.vendor || "",
      category: x.category || "Other",
      amount_cents: d2c(x.amount),
      recurring: !!x.recurring,
      notes: x.notes || null,
    };
    if (x.id) {
      const { error } = await sb.from("expenses").update(row).eq("id", x.id);
      if (error) throw new Error("updateExpense: " + error.message);
      return x.id;
    }
    const { data, error } = await sb.from("expenses").insert(row).select("id").single();
    if (error) throw new Error("insertExpense: " + error.message);
    return data?.id || null;
  }

  async deleteExpense(id) {
    const sb = getBrowserClient();
    const { error } = await sb.from("expenses").delete().eq("id", id);
    if (error) throw new Error("deleteExpense: " + error.message);
  }

  async upsertKpi(k) {
    const sb = getBrowserClient();
    const uid = await this._uidOnce();
    const row = { user_id: uid, name: k.name || "", unit: k.unit || "#", target: k.target === "" || k.target == null ? null : +k.target, cadence: k.cadence || "weekly", sort: +k.sort || 0 };
    if (k.id) {
      const { error } = await sb.from("kpis").update(row).eq("id", k.id);
      if (error) throw new Error("updateKpi: " + error.message);
      return k.id;
    }
    const { data, error } = await sb.from("kpis").insert(row).select("id").single();
    if (error) throw new Error("insertKpi: " + error.message);
    return data?.id || null;
  }

  async deleteKpi(id) {
    const sb = getBrowserClient();
    const { error } = await sb.from("kpis").delete().eq("id", id);
    if (error) throw new Error("deleteKpi: " + error.message);
  }

  async setKpiEntry(kpiId, periodKey, value) {
    const sb = getBrowserClient();
    const uid = await this._uidOnce();
    const { error } = await sb.from("kpi_entries").upsert(
      { user_id: uid, kpi_id: kpiId, period_key: periodKey, value: +value || 0 },
      { onConflict: "kpi_id,period_key" }
    );
    if (error) throw new Error("setKpiEntry: " + error.message);
  }

  async getEmails(clientId) {
    const sb = getBrowserClient();
    const { data, error } = await sb.from("email_messages").select("*").eq("client_id", clientId).order("created_at", { ascending: true });
    if (error) throw new Error("getEmails: " + error.message);
    return (data || []).map((r) => ({ id: r.id, dir: r.direction, from: r.from_email || "", to: r.to_email || "", subject: r.subject || "", body: r.body || "", at: r.created_at }));
  }

  async signOut() {
    const sb = getBrowserClient();
    await sb.auth.signOut();
  }
}

// Local dev fallback — preserves the mockup's original localStorage behavior for
// weeks/app; deals/log live only in memory (reset on reload).
const LKEY = "ci.os.terminal.v1";
class LocalStore {
  enabled = false;
  async loadAll() {
    let blob = null;
    try {
      blob = JSON.parse(localStorage.getItem(LKEY) || "null");
    } catch {}
    if (!blob) return { sprint: null, deals: null, weeks: null, app: null, log: null, clients: null };
    return {
      sprint: null,
      deals: null,
      weeks: blob.weeks || null,
      app: { founder: blob.founder || {}, habits: blob.habits || [], goals: blob.goals || [], ops: blob.ops || {} },
      log: null,
      clients: blob.clients || null,
      invoices: blob.invoices || null,
      proposals: blob.proposals || null,
      bookings: blob.bookings || null,
      expenses: blob.expenses || null,
      kpis: blob.kpis || null,
      kpiEntries: blob.kpiEntries || null,
    };
  }
  _merge(patch) {
    let blob = {};
    try {
      blob = JSON.parse(localStorage.getItem(LKEY) || "{}") || {};
    } catch {}
    Object.assign(blob, patch);
    try {
      localStorage.setItem(LKEY, JSON.stringify(blob));
    } catch {}
  }
  async saveWeek(weekKey, w) {
    let blob = {};
    try {
      blob = JSON.parse(localStorage.getItem(LKEY) || "{}") || {};
    } catch {}
    blob.weeks = Object.assign({}, blob.weeks, { [weekKey]: w });
    try {
      localStorage.setItem(LKEY, JSON.stringify(blob));
    } catch {}
  }
  async saveApp(app) {
    this._merge({ founder: app.founder, habits: app.habits, goals: app.goals, ops: app.ops });
  }
  async upsertDeal(deal) {
    return deal.id || "local-" + Math.random().toString(36).slice(2, 9);
  }
  async deleteDeal() {}
  async seedDeals(seed) {
    return seed.map((d, i) => Object.assign({ id: "seed" + i }, d));
  }
  async upsertClient(c) {
    return c.id || "local-" + Math.random().toString(36).slice(2, 9);
  }
  async deleteClient() {}
  async upsertInvoice(inv) {
    const id = inv.id || "local-" + Math.random().toString(36).slice(2, 9);
    return inv.id ? id : { id, token: "local-" + Math.random().toString(36).slice(2, 10) };
  }
  async deleteInvoice() {}
  async upsertProposal(p) {
    const id = p.id || "local-" + Math.random().toString(36).slice(2, 9);
    return p.id ? id : { id, token: "local-" + Math.random().toString(36).slice(2, 10) };
  }
  async deleteProposal() {}
  async cancelBooking() {}
  async upsertExpense(x) { return x.id || "local-" + Math.random().toString(36).slice(2, 9); }
  async deleteExpense() {}
  async upsertKpi(k) { return k.id || "local-" + Math.random().toString(36).slice(2, 9); }
  async deleteKpi() {}
  async setKpiEntry() {}
  async getEmails() { return []; }
  async addLog() {}
  async signOut() {}
}

export const store = supabaseConfigured ? new SupabaseStore() : new LocalStore();
export { supabaseConfigured };
