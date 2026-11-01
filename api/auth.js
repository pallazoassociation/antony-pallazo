// Antony Pallazo — server-side account helper (Vercel serverless function).
//
// Runs on the server so the Supabase SERVICE key never reaches the browser.
// Set these in Vercel → Project → Settings → Environment Variables:
//   SUPABASE_SERVICE_ROLE_KEY   (required — the secret/service_role key; NO "VITE_" prefix!)
//   SUPABASE_URL                (optional — falls back to VITE_SUPABASE_URL)
//
// Endpoints (all at /api/auth):
//   GET                      → health check (shows whether the setup is correct; reveals no secrets)
//   POST ensure-account      → on a resident's/admin's FIRST login: if the password matches the
//                              stored one, create/update their Supabase Auth account.
//   POST sync-account        → admin only (needs the admin's login token): re-sync one resident's
//                              Auth account after the admin adds/edits/approves them.
//   POST status              → admin only: how many residents already have a login account.
//   POST sync-all            → admin only: create the missing accounts (never touches existing ones).

const { createClient } = require("@supabase/supabase-js");

const DOMAIN = process.env.AUTH_EMAIL_DOMAIN || "pallazo.invalid"; // must match AUTH_EMAIL_DOMAIN in App.jsx
const emailFor = (id) => String(id || "").trim().toLowerCase() + "@" + DOMAIN;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BAN_FOREVER = "876000h";

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function listAllUsers(admin) {
  const all = [];
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const batch = data.users || [];
    all.push(...batch);
    if (batch.length < 200) break;
  }
  return all;
}
async function findUserByEmail(admin, email) {
  return (await listAllUsers(admin)).find((u) => (u.email || "").toLowerCase() === email) || null;
}

// Create the Auth account, or update it if it already exists. password may be null (leave unchanged).
// known (optional) = Map of email → existing user, to avoid re-listing for every resident.
async function ensureUser(admin, email, password, appMeta, banned, known) {
  const existing = known ? known.get(email) : await findUserByEmail(admin, email);
  if (existing) {
    const attrs = { app_metadata: appMeta, ban_duration: banned ? BAN_FOREVER : "none" };
    if (password) attrs.password = password;
    const { error } = await admin.auth.admin.updateUserById(existing.id, attrs);
    if (error) throw error;
    return "updated";
  }
  const attrs = { email, email_confirm: true, app_metadata: appMeta };
  if (password) attrs.password = password;
  if (banned) attrs.ban_duration = BAN_FOREVER;
  const { data, error } = await admin.auth.admin.createUser(attrs);
  if (error) throw error;
  if (known && data && data.user) known.set(email, data.user);
  return "created";
}

// Plain-language reason for an account-creation failure (shown to the admin)
function reasonFor(e) {
  const code = String((e && e.code) || ""), msg = String((e && e.message) || e || "");
  if (code === "weak_password" || /password/i.test(msg)) return "password too short or too weak for Supabase — ask the resident to change it";
  if (/email/i.test(msg)) return "login address not accepted by Supabase: " + msg.slice(0, 100);
  return msg.slice(0, 120) || "unknown error";
}

// Caller must present a valid Auth token belonging to an admin (shared admin or committee member)
async function requireAdmin(admin, req) {
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return { error: [400, "bad_request"] };
  const { data: who, error } = await admin.auth.getUser(token);
  const caller = who && who.user;
  if (error || !caller) return { error: [401, "invalid_token"] };
  const meta = caller.app_metadata || {};
  let isAdmin = meta.kind === "super";
  if (!isAdmin && meta.kind === "resident" && meta.resident_id) {
    const { data: g } = await admin.from("admin_group").select("resident_user_id").eq("resident_user_id", meta.resident_id);
    isAdmin = !!(g && g.length > 0);
  }
  return isAdmin ? { caller } : { error: [403, "forbidden"] };
}

async function inBatches(list, size, fn) {
  for (let i = 0; i < list.length; i += size) await Promise.all(list.slice(i, i + size).map(fn));
}

function makeHandler(getAdmin) {
  return async function handler(req, res) {
    let admin;
    try { admin = getAdmin(); } catch (e) { admin = null; }

    // ── Health check ───────────────────────────────────────────
    if (req.method === "GET") {
      const out = { ok: true, supabaseUrlSet: !!admin, serviceKeyWorks: false, emailDomain: DOMAIN };
      if (admin) {
        try {
          const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
          out.serviceKeyWorks = !error;
          if (error) out.hint = "Service key rejected by Supabase — re-copy it into Vercel (Settings → Environment Variables).";
        } catch (e) { out.hint = "Could not reach Supabase with the service key."; }
      } else {
        out.hint = "Missing SUPABASE_SERVICE_ROLE_KEY (or Supabase URL) in Vercel environment variables.";
      }
      return send(res, 200, out);
    }

    if (req.method !== "POST") return send(res, 405, { ok: false, error: "method_not_allowed" });
    if (!admin) return send(res, 503, { ok: false, error: "not_configured" });

    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
    if (!body || typeof body !== "object") return send(res, 400, { ok: false, error: "bad_request" });

    try {
      // ── First login: create/update the Auth account if the password is right ──
      if (body.action === "ensure-account") {
        const { kind, identifier, password } = body;
        if (!["resident", "super"].includes(kind) ||
            typeof identifier !== "string" || !identifier || identifier.length > 64 ||
            typeof password !== "string" || !password || password.length > 200)
          return send(res, 400, { ok: false, error: "bad_request" });

        let appMeta;
        if (kind === "super") {
          const { data, error } = await admin.from("super_admin_credentials").select("username,password_hash").eq("id", 1).single();
          if (error || !data) return send(res, 503, { ok: false, error: "unavailable" });
          if (identifier !== data.username || password !== data.password_hash) { await sleep(400); return send(res, 401, { ok: false, error: "invalid" }); }
          appMeta = { kind: "super" };
        } else {
          const { data, error } = await admin.from("resident_users").select("id,phone,status,password_hash").eq("phone", identifier).eq("status", "active");
          if (error) return send(res, 503, { ok: false, error: "unavailable" });
          if (!data || data.length !== 1 || password !== data[0].password_hash) { await sleep(400); return send(res, 401, { ok: false, error: "invalid" }); }
          appMeta = { kind: "resident", resident_id: data[0].id };
        }
        const result = await ensureUser(admin, emailFor(identifier), password, appMeta, false);
        return send(res, 200, { ok: true, result });
      }

      // ── Admin action: re-sync one resident's Auth account ──────
      if (body.action === "sync-account") {
        if (typeof body.resident_id !== "string" || !body.resident_id) return send(res, 400, { ok: false, error: "bad_request" });
        const gate = await requireAdmin(admin, req);
        if (gate.error) return send(res, gate.error[0], { ok: false, error: gate.error[1] });

        const { data: row, error: rowErr } = await admin.from("resident_users").select("id,phone,status,password_hash").eq("id", body.resident_id).single();
        if (rowErr || !row) return send(res, 404, { ok: false, error: "not_found" });
        const result = await ensureUser(admin, emailFor(row.phone), row.password_hash || null,
          { kind: "resident", resident_id: row.id }, row.status !== "active");
        return send(res, 200, { ok: true, result });
      }

      // ── Admin actions: readiness report / create all missing accounts ──
      if (body.action === "status" || body.action === "sync-all") {
        const gate = await requireAdmin(admin, req);
        if (gate.error) return send(res, gate.error[0], { ok: false, error: gate.error[1] });

        const known = new Map((await listAllUsers(admin)).map((u) => [String(u.email || "").toLowerCase(), u]));
        const { data: rows, error: rowsErr } = await admin.from("resident_users").select("id,phone,flat_id,name,status,password_hash").eq("status", "active");
        if (rowsErr || !rows) return send(res, 503, { ok: false, error: "unavailable" });
        const { data: sa } = await admin.from("super_admin_credentials").select("username,password_hash").eq("id", 1).single();

        const phoneCount = {};
        rows.forEach((r) => { phoneCount[r.phone] = (phoneCount[r.phone] || 0) + 1; });
        const items = rows.map((r) => ({ r, email: emailFor(r.phone), has: known.has(emailFor(r.phone)), dup: phoneCount[r.phone] > 1 }));
        const sharedReady = sa ? known.has(emailFor(sa.username)) : null;
        const label = (i) => ({ flat_id: i.r.flat_id, name: i.r.name });

        if (body.action === "status") {
          const missing = items.filter((i) => !i.has).map((i) => Object.assign(label(i),
            i.dup ? { reason: "same phone number as another resident" } : !i.r.password_hash ? { reason: "no password stored" } : {}));
          return send(res, 200, { ok: true, total: items.length, ready: items.length - missing.length, missing, shared_admin_ready: sharedReady });
        }

        // sync-all: create only what is missing; existing accounts are never touched
        let created = 0; const failed = [];
        if (sa && !sharedReady) {
          try { await ensureUser(admin, emailFor(sa.username), sa.password_hash, { kind: "super" }, false, known); created++; }
          catch (e) { failed.push({ flat_id: "—", name: "Shared admin login", reason: reasonFor(e) }); }
        }
        const todo = items.filter((i) => !i.has);
        await inBatches(todo, 5, async (i) => {
          if (i.dup) return failed.push(Object.assign(label(i), { reason: "same phone number as another resident" }));
          if (!i.r.password_hash) return failed.push(Object.assign(label(i), { reason: "no password stored" }));
          try { await ensureUser(admin, i.email, i.r.password_hash, { kind: "resident", resident_id: i.r.id }, false, known); created++; }
          catch (e) { failed.push(Object.assign(label(i), { reason: reasonFor(e) })); }
        });
        return send(res, 200, { ok: true, created, failed });
      }

      return send(res, 400, { ok: false, error: "unknown_action" });
    } catch (e) {
      return send(res, 500, { ok: false, error: "account_error", detail: String((e && e.message) || e).slice(0, 200) });
    }
  };
}

function realAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

module.exports = makeHandler(realAdmin);
module.exports.makeHandler = makeHandler; // exported for tests
