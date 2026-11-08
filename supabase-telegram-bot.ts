// Northstar Telegram bot webhook (@northstar_smartum_bot).
// Ota-ona saytda "Telegram'ga ulash" -> 6 xonali kod oladi -> botga yuboradi -> bog'lanadi.
// Buyruqlar: /start, /holat (bugungi holat), /hisobot (haftalik), /uzish.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const SITE = "https://beck65909-sys.github.io/northstar/";

async function cfg(k: string) {
  const { data } = await db.rpc("bot_cfg", { p_k: k });
  return (data ?? undefined) as string | undefined;
}
const OY = ["yanvar","fevral","mart","aprel","may","iyun","iyul","avgust","sentabr","oktabr","noyabr","dekabr"];
const fmtDue = (iso: string) => { const d = new Date(new Date(iso).toLocaleString("en-US", { timeZone: "Asia/Tashkent" })); return d.getDate() + "-" + OY[d.getMonth()] + ", " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
const esc = (t: unknown) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function send(token: string, chat: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
}

async function kidsOf(profileId: string) {
  const { data: p } = await db.from("profiles").select("id, role, full_name").eq("id", profileId).maybeSingle();
  if (!p) return [];
  if (p.role === "student") return [p];
  const { data: links } = await db.from("parent_students").select("student_id").eq("parent_id", profileId);
  const ids = (links ?? []).map((l: any) => l.student_id);
  if (!ids.length) return [];
  const { data: kids } = await db.from("profiles").select("id, full_name").in("id", ids);
  return kids ?? [];
}

async function todayStatus(kid: any) {
  const d = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" });
  const { data: st } = await db.from("students").select("group_id").eq("profile_id", kid.id).maybeSingle();
  const { data: ch } = await db.from("daily_challenges").select("score").eq("student_id", kid.id).eq("challenge_date", d).maybeSingle();
  const { data: sk } = await db.from("streaks").select("current_streak").eq("student_id", kid.id).maybeSingle();
  const { data: open } = await db.from("assignments").select("id, title, due_at").eq("target_group_id", st?.group_id ?? "").gte("due_at", new Date().toISOString()).order("due_at");
  const { data: subs } = await db.from("submissions").select("assignment_id").eq("student_id", kid.id);
  const done = new Set((subs ?? []).map((s: any) => s.assignment_id));
  const todo = (open ?? []).filter((a: any) => !done.has(a.id));
  return `👤 <b>${esc(kid.full_name)}</b>\n` +
    `🔥 Daily Challenge: ${ch ? `bajarildi (${ch.score}/3)` : "hali bajarilmagan"}\n` +
    `📅 Streak: ${sk?.current_streak ?? 0} kun\n` +
    (todo.length ? `📝 Topshirilmagan vazifalar:\n${todo.map((a: any) => `  • ${esc(a.title)} — ${fmtDue(a.due_at)} gacha`).join("\n")}` : "📝 Hamma vazifa topshirilgan ✅");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const secret = await cfg("tg_webhook_secret");
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) return new Response("forbidden", { status: 403 });
  const token = (await cfg("tg_token"))!;
  const upd = await req.json().catch(() => ({}));
  const m = upd.message; if (!m?.chat?.id || m.chat.type !== "private") return new Response("ok");
  const chat = m.chat.id as number; const text = String(m.text ?? "").trim();
  const { data: link } = await db.from("telegram_links").select("profile_id").eq("chat_id", chat).maybeSingle();

  const code = text.match(/^(?:\/start\s+)?(\d{6})$/)?.[1];
  if (code) {
    const { data: l } = await db.from("telegram_links").select("profile_id, code_expires").eq("link_code", code).maybeSingle();
    if (!l || new Date(l.code_expires) < new Date()) { await send(token, chat, "❌ Kod noto'g'ri yoki muddati o'tgan. Saytdan yangi kod oling."); return new Response("ok"); }
    await db.from("telegram_links").update({ chat_id: null }).eq("chat_id", chat);
    await db.from("telegram_links").update({ chat_id: chat, linked_at: new Date().toISOString(), link_code: null, code_expires: null }).eq("profile_id", l.profile_id);
    const kids = await kidsOf(l.profile_id);
    await send(token, chat, `✅ Ulandi!${kids.length ? "\nFarzand(lar): " + kids.map((k: any) => "<b>" + esc(k.full_name) + "</b>").join(", ") : ""}\n\nEndi siz:\n• baho qo'yilganda darhol xabar\n• har kuni 19:00 da eslatma (agar kerak bo'lsa)\n• har yakshanba 20:00 da haftalik hisobot\n• maktab e'lonlarini olasiz.\n\n/holat — bugungi holat\n/uzish — botni uzish`);
    return new Response("ok");
  }
  if (!link) {
    await send(token, chat, `Assalomu alaykum! Bu <b>Northstar · Smartum International School</b> boti.\n\nUlash uchun:\n1) ${SITE} saytiga login bilan kiring\n2) "📲 Telegram'ga ulash" tugmasini bosing\n3) Chiqqan 6 xonali kodni shu yerga yuboring.`);
    return new Response("ok");
  }
  if (text.startsWith("/uzish")) {
    await db.from("telegram_links").update({ chat_id: null, linked_at: null }).eq("chat_id", chat);
    await send(token, chat, "Bot uzildi. Qayta ulash uchun saytdan yangi kod oling.");
    return new Response("ok");
  }
  const kids = await kidsOf(link.profile_id);
  if (!kids.length) { await send(token, chat, "Sizga hali farzand biriktirilmagan. O'qituvchiga murojaat qiling."); return new Response("ok"); }
  const parts = await Promise.all(kids.map(todayStatus));
  await send(token, chat, parts.join("\n\n") + `\n\n🌐 Batafsil: ${SITE}`);
  return new Response("ok");
});
