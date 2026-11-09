// Northstar: uy vazifasini AI (Gemini) bilan oldindan tekshirish. Supabase'da ishlayotgan versiya: v8.
// O'quvchi yoki o'qituvchi chaqiradi: POST { submission_id }.
// Matnli javob ham, daftar surati (rasm) ham tekshiriladi.
// Natija submission_grades.ai_score / ai_feedback ga yoziladi, status 'ai_checked' bo'ladi.
// Yakuniy bahoni baribir o'qituvchi tasdiqlaydi.
// O'quvchi bitta ishni faqat 1 marta AI'ga tekshirtira oladi; o'qituvchi qayta tekshirtira oladi.
// GEMINI_API_KEY Supabase -> Edge Functions -> Secrets da bo'lishi kerak.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const GKEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODELS = ["gemini-flash-latest", "gemini-3.8-flash", "gemini-flash-lite-latest"];
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const IMG: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" };
const MAX_IMAGES = 3, MAX_BYTES = 4 * 1024 * 1024;

const PROMPT = (title: string, task: string, answer: string, photos: number) => `You are an experienced English teacher checking homework of a 10-12 year old A1 learner in Uzbekistan.
Assignment title: ${title}
Task: ${task || "(no extra instructions)"}
${answer ? `Student's typed answer:\n"""\n${answer.slice(0, 4000)}\n"""` : "The student typed no text."}
${photos ? `The student also attached ${photos} photo(s) of handwritten work. Read the handwriting carefully and grade what is written. If a photo is unreadable or unrelated, say so.` : ""}
Grade it from 0 to 100 (task completion 40%, grammar 30%, vocabulary & spelling 20%, length/effort 10%). Be encouraging but honest.
Return ONLY JSON: {"score": <int 0-100>, "feedback": "<2-3 short sentences in simple English: one thing done well, the main mistake with the correct form, one next step>", "feedback_uz": "<the same feedback for the PARENT, 1-2 short sentences in simple Uzbek (Latin script)>", "mistakes": [{"item": "<wrong text>", "correction": "<correct text>", "topic": "<grammar topic>"}]}
If the answer is empty, not English, or unrelated to the task, give a low score and say so.`;

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

async function gemini(parts: Part[]) {
  const errs: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2500 * attempt));
    for (const m of MODELS) {
      const res = await tryModel(m, parts);
      if (res.ok) return res.data;
      errs.push(res.err);
      if (!res.retry) throw new Error(res.err);
    }
  }
  throw new Error(errs.slice(-3).map((e) => e.slice(0, 70)).join(" | "));
}

async function tryModel(m: string, parts: Part[]): Promise<{ ok: true; data: any } | { ok: false; err: string; retry: boolean }> {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GKEY },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }),
      signal: AbortSignal.timeout(40000),
    });
    const b = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = `${m}: ${r.status} ${String(b?.error?.message ?? "").slice(0, 120)}`;
      return { ok: false, err, retry: ![400, 401, 403].includes(r.status) };
    }
    const t = (b.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
    return { ok: true, data: JSON.parse(t) };
  } catch (e) { return { ok: false, err: `${m}: ${e}`, retry: true }; }
}

async function loadImages(paths: string[] | null): Promise<Part[]> {
  const out: Part[] = [];
  for (const p of (paths ?? [])) {
    if (out.length >= MAX_IMAGES) break;
    const ext = String(p).split(".").pop()?.toLowerCase() ?? "";
    const mime = IMG[ext];
    if (!mime) continue;
    const { data, error } = await admin.storage.from("submissions").download(p);
    if (error || !data || data.size > MAX_BYTES) continue;
    out.push({ inline_data: { mime_type: mime, data: encodeBase64(new Uint8Array(await data.arrayBuffer())) } });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "POST kerak" }, 405);
  if (!GKEY) return j({ error: "AI hali ulanmagan (GEMINI_API_KEY yo'q)" }, 503);
  const auth = req.headers.get("Authorization") ?? "";
  const user = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const token = auth.replace(/^Bearer\s+/i, "");
  const { data: { user: u } } = await user.auth.getUser(token);
  if (!u) return j({ error: "Kirish kerak" }, 401);
  let body: any; try { body = await req.json(); } catch { return j({ error: "JSON xato" }, 400); }
  const sid = String(body.submission_id ?? "");
  if (body.translate) {
    const { data: g } = await user.from("submission_grades").select("submission_id, final_feedback, final_score, feedback_uz").eq("submission_id", sid).maybeSingle();
    if (!g?.final_feedback) return j({ error: "Izoh topilmadi" }, 404);
    if (g.feedback_uz && !body.force) return j({ feedback_uz: g.feedback_uz });
    try {
      const r = await gemini([{ text: `Translate this English teacher feedback for a 10-12 year old student into simple Uzbek (Latin script) for the PARENT, 1-2 short sentences, keep English words/examples in quotes. Score: ${g.final_score}/100. Feedback: "${String(g.final_feedback).slice(0, 800)}". Return ONLY JSON: {"feedback_uz": "..."}` }]);
      const uz = String(r.feedback_uz ?? "").slice(0, 600);
      await admin.from("submission_grades").update({ feedback_uz: uz }).eq("submission_id", sid);
      return j({ feedback_uz: uz });
    } catch (e) { return j({ error: String(e).slice(0, 150) }, 502); }
  }
  const { data: sub } = await user.from("submissions").select("id, student_id, text_answer, file_paths, status, assignment_id").eq("id", sid).maybeSingle();
  if (!sub) return j({ error: "Ish topilmadi" }, 404);
  if (sub.status === "approved") return j({ error: "Ish allaqachon baholangan" }, 409);
  if (sub.student_id === u.id) {
    const { data: prev } = await admin.from("submission_grades").select("ai_checked_at").eq("submission_id", sub.id).maybeSingle();
    if (prev?.ai_checked_at || sub.status !== "submitted") return j({ error: "Bu ish AI tomonidan tekshirilgan. Endi o'qituvchi bahosini kuting." }, 409);
  }
  const text = (sub.text_answer ?? "").trim();
  const images = await loadImages(sub.file_paths);
  if (text.length < 5 && !images.length) {
    const hasFiles = (sub.file_paths ?? []).length > 0;
    return j({ error: hasFiles ? "AI faqat rasmni (JPG, PNG) o'qiy oladi. Bu faylni o'zingiz tekshiring." : "Javob juda qisqa: AI tekshirishi uchun matn yoki daftar surati kerak." }, 400);
  }
  const { data: a } = await admin.from("assignments").select("title, instructions").eq("id", sub.assignment_id).maybeSingle();
  try {
    const r = await gemini([{ text: PROMPT(a?.title ?? "", a?.instructions ?? "", text, images.length) }, ...images]);
    const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));
    const feedback = String(r.feedback ?? "").slice(0, 800);
    const feedbackUz = String(r.feedback_uz ?? "").slice(0, 600) || null;
    await admin.from("submission_grades").upsert({ submission_id: sub.id, ai_score: score, ai_feedback: feedback, feedback_uz: feedbackUz, ai_checked_at: new Date().toISOString() });
    await admin.from("submissions").update({ status: "ai_checked" }).eq("id", sub.id).in("status", ["submitted"]);
    const ms = Array.isArray(r.mistakes) ? r.mistakes.slice(0, 5) : [];
    await admin.from("student_mistakes").delete().eq("source_submission_id", sub.id).eq("is_resolved", false);
    if (ms.length) await admin.from("student_mistakes").insert(ms.filter((m: any) => m?.item).map((m: any) => ({ student_id: sub.student_id, topic: String(m.topic ?? "general").slice(0, 80), item: String(m.item).slice(0, 200), correction: String(m.correction ?? "").slice(0, 200), source_submission_id: sub.id })));
    return j({ ai_score: score, ai_feedback: feedback, photos: images.length });
  } catch (e) {
    return j({ error: "AI javob bermadi (Gemini band bo'lishi mumkin, birozdan keyin qayta urining): " + String(e).slice(0, 200) }, 502);
  }
});
