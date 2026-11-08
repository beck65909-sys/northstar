// Northstar: uy vazifasini AI (Gemini) bilan oldindan tekshirish.
// O'quvchi yoki o'qituvchi chaqiradi: POST { submission_id }.
// Natija submission_grades.ai_score / ai_feedback ga yoziladi, status 'ai_checked' bo'ladi.
// Yakuniy bahoni baribir o'qituvchi tasdiqlaydi.
// GEMINI_API_KEY Supabase -> Edge Functions -> Secrets da bo'lishi kerak.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const GKEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const MODELS = ["gemini-flash-latest", "gemini-3.8-flash"];
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const PROMPT = (title: string, task: string, answer: string) => `You are an experienced English teacher checking homework of a 10-12 year old A1 learner in Uzbekistan.
Assignment title: ${title}
Task: ${task || "(no extra instructions)"}
Student's answer:
"""
${answer.slice(0, 4000)}
"""
Grade it from 0 to 100 (task completion 40%, grammar 30%, vocabulary & spelling 20%, length/effort 10%). Be encouraging but honest.
Return ONLY JSON: {"score": <int 0-100>, "feedback": "<2-3 short sentences in simple English: one thing done well, the main mistake with the correct form, one next step>", "feedback_uz": "<the same feedback for the PARENT, 1-2 short sentences in simple Uzbek (Latin script)>", "mistakes": [{"item": "<wrong text>", "correction": "<correct text>", "topic": "<grammar topic>"}]}
If the answer is empty, not English, or unrelated to the task, give a low score and say so.`;

async function gemini(prompt: string) {
  let last = "";
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GKEY },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }),
        signal: AbortSignal.timeout(60000),
      });
      const b = await r.json();
      if (!r.ok) { last = `${m}: ${r.status} ${JSON.stringify(b).slice(0, 200)}`; continue; }
      const t = (b.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
      return JSON.parse(t);
    } catch (e) { last = `${m}: ${e}`; }
  }
  throw new Error(last);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "POST kerak" }, 405);
  if (!GKEY) return j({ error: "AI hali ulanmagan (GEMINI_API_KEY yo'q)" }, 503);
  const auth = req.headers.get("Authorization") ?? "";
  const user = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: { user: u } } = await user.auth.getUser();
  if (!u) return j({ error: "Kirish kerak" }, 401);
  let body: any; try { body = await req.json(); } catch { return j({ error: "JSON xato" }, 400); }
  const sid = String(body.submission_id ?? "");
  if (body.translate) {
    // O'qituvchi tasdiqlagan izohni ota-ona uchun o'zbekchaga o'girish (faqat o'z o'quvchisi)
    const { data: g } = await user.from("submission_grades").select("submission_id, final_feedback, final_score").eq("submission_id", sid).maybeSingle();
    if (!g?.final_feedback) return j({ error: "Izoh topilmadi" }, 404);
    try {
      const r = await gemini(`Translate this English teacher feedback for a 10-12 year old student into simple Uzbek (Latin script) for the PARENT, 1-2 short sentences, keep English words/examples in quotes. Score: ${g.final_score}/100. Feedback: "${String(g.final_feedback).slice(0, 800)}". Return ONLY JSON: {"feedback_uz": "..."}`);
      const uz = String(r.feedback_uz ?? "").slice(0, 600);
      await admin.from("submission_grades").update({ feedback_uz: uz }).eq("submission_id", sid);
      return j({ feedback_uz: uz });
    } catch (e) { return j({ error: String(e).slice(0, 150) }, 502); }
  }
  // RLS orqali: foydalanuvchi bu ishni ko'ra olishi shart (o'z ishi yoki o'z o'quvchisi)
  const { data: sub } = await user.from("submissions").select("id, student_id, text_answer, status, assignment_id").eq("id", sid).maybeSingle();
  if (!sub) return j({ error: "Ish topilmadi" }, 404);
  if (sub.status === "approved") return j({ error: "Ish allaqachon baholangan" }, 409);
  if (!sub.text_answer || sub.text_answer.trim().length < 5) return j({ error: "Javob juda qisqa" }, 400);
  const { data: a } = await admin.from("assignments").select("title, instructions").eq("id", sub.assignment_id).maybeSingle();
  try {
    const r = await gemini(PROMPT(a?.title ?? "", a?.instructions ?? "", sub.text_answer));
    const score = Math.max(0, Math.min(100, Math.round(Number(r.score) || 0)));
    const feedback = String(r.feedback ?? "").slice(0, 800);
    const feedbackUz = String(r.feedback_uz ?? "").slice(0, 600) || null;
    await admin.from("submission_grades").upsert({ submission_id: sub.id, ai_score: score, ai_feedback: feedback, feedback_uz: feedbackUz, ai_checked_at: new Date().toISOString() });
    await admin.from("submissions").update({ status: "ai_checked" }).eq("id", sub.id).in("status", ["submitted"]);
    const ms = Array.isArray(r.mistakes) ? r.mistakes.slice(0, 5) : [];
    if (ms.length) await admin.from("student_mistakes").insert(ms.filter((m: any) => m?.item).map((m: any) => ({ student_id: sub.student_id, topic: String(m.topic ?? "general").slice(0, 80), item: String(m.item).slice(0, 200), correction: String(m.correction ?? "").slice(0, 200), source_submission_id: sub.id })));
    return j({ ai_score: score, ai_feedback: feedback });
  } catch (e) {
    return j({ error: "AI javob bermadi: " + String(e).slice(0, 150) }, 502);
  }
});
