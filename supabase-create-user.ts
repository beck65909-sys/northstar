// Supabase Edge Function "create-user" (verify_jwt = false; authenticates the caller itself).
// POST {role, full_name, login?, password?, group_id? (student), child_id? (parent)}
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const ROLES = ["head_teacher", "teacher", "student", "parent"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  const role = String(body.role || "");
  const full_name = String(body.full_name || "").trim();
  let login = String(body.login || "").trim().toLowerCase();
  const password = String(body.password || Math.floor(100000 + Math.random() * 900000));
  if (!ROLES.includes(role) || !full_name) return json({ error: "role va full_name kerak" }, 400);
  if (password.length < 6) return json({ error: "Parol kamida 6 belgi" }, 400);

  // Who is calling?
  let caller: { id: string; role: string } | null = null;
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (token) {
    const { data } = await admin.auth.getUser(token);
    if (data?.user) {
      const { data: p } = await admin.from("profiles").select("id, role").eq("id", data.user.id).single();
      if (p) caller = p as any;
    }
  }
  const teachesGroup = async (groupId: string, teacherId: string) => {
    if (!groupId) return false;
    const { data: g } = await admin.from("groups").select("class_id").eq("id", groupId).maybeSingle();
    if (!g) return false;
    const { data: ct } = await admin.from("class_teachers").select("class_id").eq("class_id", g.class_id).eq("teacher_id", teacherId).maybeSingle();
    return !!ct;
  };

  // Permissions: first head teacher can bootstrap; head creates anyone; teacher creates students in own groups and their parents.
  const { count: headCount } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "head_teacher");
  const bootstrap = role === "head_teacher" && (headCount ?? 0) === 0;
  if (!bootstrap) {
    if (!caller) return json({ error: "Avval tizimga kiring" }, 401);
    if (caller.role === "head_teacher") { /* may create anyone */ }
    else if (caller.role === "teacher") {
      if (role === "student") {
        if (!(await teachesGroup(body.group_id, caller.id))) return json({ error: "Bu guruh sizga biriktirilmagan" }, 403);
      } else if (role === "parent") {
        const { data: st } = await admin.from("students").select("group_id").eq("profile_id", body.child_id).maybeSingle();
        if (!st || !(await teachesGroup(st.group_id, caller.id))) return json({ error: "Bu o'quvchi sizniki emas" }, 403);
      } else return json({ error: "O'qituvchi faqat o'quvchi va ota-ona qo'sha oladi" }, 403);
    } else return json({ error: "Ruxsat yo'q" }, 403);
  }

  // Login: from the name if empty, made unique.
  if (!login) login = (full_name.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, "").trim().split(/\s+/)[0] || "user").slice(0, 20);
  if (login.length < 3) login = login.padEnd(3, "0");
  let candidate = login, i = 1;
  while (true) {
    const { data: ex } = await admin.from("profiles").select("id").eq("login", candidate).maybeSingle();
    if (!ex) break;
    candidate = login + (++i);
  }
  login = candidate;
  if (!/^[a-z0-9._-]{3,32}$/.test(login)) return json({ error: "Login faqat lotin harf, raqam, . _ - (3-32)" }, 400);

  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email: `${login}@northstar.local`, password, email_confirm: true, user_metadata: { full_name } });
  if (cErr || !created.user) return json({ error: cErr?.message || "Yaratilmadi" }, 400);
  const id = created.user.id;
  const rollback = async (msg: string) => { await admin.auth.admin.deleteUser(id); return json({ error: msg }, 400); };

  const { error: pErr } = await admin.from("profiles").insert({ id, role, login, full_name, head_teacher_id: role === "teacher" && caller?.role === "head_teacher" ? caller.id : null });
  if (pErr) return rollback(pErr.message);
  if (role === "student") {
    if (!body.group_id) return rollback("group_id kerak");
    const { error } = await admin.from("students").insert({ profile_id: id, group_id: body.group_id, created_by: caller?.id ?? null });
    if (error) return rollback(error.message);
  }
  if (role === "parent" && body.child_id) {
    const { error } = await admin.from("parent_students").insert({ parent_id: id, student_id: body.child_id });
    if (error) return rollback(error.message);
  }
  return json({ id, login, password, role, full_name });
});
