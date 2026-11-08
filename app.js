/* Northstar web app — Supabase backend */
(function () {
const SB_URL = 'https://fzrkdqbplzkovvggydid.supabase.co';
const SB_KEY = 'sb_publishable_x9IbWjNpf_bYLO-7N5qZXg_EjcfTuID';
const sb = window.supabase.createClient(SB_URL, SB_KEY);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const OYLAR = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
const fmt = iso => { if (!iso) return '—'; const d = new Date(iso); return d.getDate() + '-' + OYLAR[d.getMonth()] + ', ' + d.toTimeString().slice(0,5); };
const todayISO = () => new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Tashkent'});
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2800); }
const medal = i => i === 0 ? 'var(--accent)' : i === 1 ? 'var(--silver)' : i === 2 ? 'var(--bronze)' : 'var(--info)';
const STAR = '<svg width="36" height="36" viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,6 54,19 63,11 58,23 70,24 58,28 63,37 54,30 50,42 46,30 37,37 42,28 30,24 42,23 37,11 46,19" fill="#F5B942"/><path d="M20 52 L50 40 L80 52 M26 56 V72 M38 56 V72 M50 56 V72 M62 56 V72 M74 56 V72 M22 74 H78" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M50 94 C42 89 34 88 26 89 V80 C34 79 42 80 50 85 C58 80 66 79 74 80 V89 C66 88 58 89 50 94 Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>';
const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  task: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
  cup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.8 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>'
};

/* A1 Unit 1 topics (grade-5 plan) with parent questions */
let TOPICS = [
  {t:'A / An — Indefinite Articles', ask:[['"Bir olma" inglizcha qanday?','an apple'],['"Bir kitob" inglizcha qanday?','a book'],['"egg" oldidan a yoki an?','an']]},
  {t:'Plurals — Regular Plural Nouns', ask:[['"cat" ko\'plikda?','cats'],['"box" ko\'plikda?','boxes'],['"bus" ko\'plikda?','buses']]},
  {t:'Plurals — Irregular Plurals', ask:[['"child" ko\'plikda?','children'],['"man" ko\'plikda?','men'],['"tooth" ko\'plikda?','teeth']]},
  {t:'Personal Pronouns', ask:[['"U (qiz)" inglizcha?','she'],['"Biz" inglizcha?','we'],['"Ular" inglizcha?','they']]},
  {t:'The Verb "To Be" — Am / Is / Are', ask:[['I ___ a student.','am'],['She ___ my sister.','is'],['They ___ friends.','are']]},
  {t:'"To Be" — Questions & Negatives', ask:[['"Are you happy?" — qisqa javob (ha)','Yes, I am.'],['"He is not tired" — qisqartirib','He isn\'t tired.'],['"Is it a cat?" (yo\'q)','No, it isn\'t.']]},
  {t:'Progress Check — Unit 1', ask:[['"woman" ko\'plikda?','women'],['We ___ in class 5.','are'],['___ umbrella (a/an)','an']]}
];
/* t = TOPICS index (0..6). Challenge: 2 questions from the current topic + 1 review from earlier topics. */
const BANK = [
  {t:0, q:'Choose the correct article: ___ orange', o:['a','an'], a:1},
  {t:0, q:'Choose the correct article: ___ pen', o:['a','an'], a:0},
  {t:0, q:'Choose the correct article: ___ umbrella', o:['a','an'], a:1},
  {t:0, q:'Choose the correct article: ___ elephant', o:['a','an'], a:1},
  {t:0, q:'Choose the correct article: ___ dog', o:['a','an'], a:0},
  {t:0, q:'Choose the correct article: ___ hour', o:['a','an'], a:1},
  {t:0, q:'Match the word: "kitob"', o:['book','bag','boot'], a:0},
  {t:1, q:'Choose the plural: one box, two ___', o:['boxs','boxes','box'], a:1},
  {t:1, q:'Choose the plural: one cat, two ___', o:['cats','cates','cat'], a:0},
  {t:1, q:'Choose the plural: one bus, two ___', o:['buss','buses','busses'], a:1},
  {t:1, q:'Choose the plural: one baby, two ___', o:['babys','babies','babyes'], a:1},
  {t:1, q:'Choose the plural: one watch, two ___', o:['watchs','watches','watch'], a:1},
  {t:2, q:'Choose the plural: one child, two ___', o:['childs','children','childrens'], a:1},
  {t:2, q:'Choose the plural: one foot, two ___', o:['foots','feet','feets'], a:1},
  {t:2, q:'Choose the plural: one man, two ___', o:['mans','men','mens'], a:1},
  {t:2, q:'Choose the plural: one tooth, two ___', o:['tooths','teeth','teeths'], a:1},
  {t:2, q:'Choose the plural: one mouse, two ___', o:['mouses','mice','mices'], a:1},
  {t:3, q:'Choose the pronoun: Ali is my friend. ___ is 11.', o:['She','He','It'], a:1},
  {t:3, q:'Choose the pronoun: Madina and I are classmates. ___ like English.', o:['They','We','You'], a:1},
  {t:3, q:'Choose the pronoun: My sister is a doctor. ___ is kind.', o:['He','She','They'], a:1},
  {t:3, q:'Choose the pronoun: The books are new. ___ are on the desk.', o:['It','They','We'], a:1},
  {t:3, q:'Match the word: "oila"', o:['family','father','friend'], a:0},
  {t:4, q:'Fill in the gap: I ___ eleven years old.', o:['am','is','are'], a:0},
  {t:4, q:'Fill in the gap: My mother ___ a teacher.', o:['am','is','are'], a:1},
  {t:4, q:'Fill in the gap: We ___ in class 5-A.', o:['am','is','are'], a:2},
  {t:4, q:'Fill in the gap: They ___ my friends.', o:['am','is','are'], a:2},
  {t:4, q:'Fill in the gap: It ___ a big school.', o:['am','is','are'], a:1},
  {t:5, q:'Put the words in order: you / are / happy / ?', o:['Are you happy?','You are happy?','Happy are you?'], a:0},
  {t:5, q:'Choose the short answer: Is it a dog? (no)', o:['No, it isn\'t.','No, it not.','No, isn\'t it.'], a:0},
  {t:5, q:'Choose the negative: She is tired.', o:['She isn\'t tired.','She not tired.','She aren\'t tired.'], a:0},
  {t:5, q:'Choose the short answer: Are they students? (yes)', o:['Yes, they are.','Yes, they is.','Yes, are they.'], a:0},
  {t:5, q:'Choose the question: He is at home.', o:['Is he at home?','He is at home?','Are he at home?'], a:0},
  {t:6, q:'Choose the correct sentence:', o:['They are children.','They is childrens.','They are childs.'], a:0},
  {t:6, q:'Fill in the gap: ___ apple and ___ banana', o:['an / a','a / an','a / a'], a:0},
  {t:6, q:'Choose the correct sentence:', o:['I am not a teacher.','I is not a teacher.','I not am a teacher.'], a:0},
  {t:6, q:'Choose the plural: one woman, two ___', o:['womans','women','womens'], a:1}
];
const shuffle = arr => [...arr].sort(() => Math.random() - .5);
/* Savollar: bazadagi dars quiz bo'limidan (Unit 1-8), bo'lmasa ichki BANK dan */
const quizOf = i => (TOPICS[i] && TOPICS[i].quiz && TOPICS[i].quiz.length) ? TOPICS[i].quiz.map(x => ({...x, t: i})) : BANK.filter(x => x.t === i);
function pickChallenge(topic) {
  let pool = shuffle(quizOf(topic));
  if (!pool.length) pool = shuffle(BANK);
  const prev = []; for (let i = 0; i < topic; i++) prev.push(...quizOf(i));
  const rev = shuffle(prev);
  if (!rev.length) return pool.slice(0, 3); // birinchi mavzu: hammasi joriy mavzudan
  return [...pool.slice(0, 2), {...rev[0], review: true}];
}
/* O'quv dasturi (curriculum) = namuna darslar, Unit va dars tartibida */
async function loadCurriculum() {
  if (loadCurriculum.done) return;
  try {
    const rows = await q(sb.from('lessons').select('id,title,position,unit_id,units(position,title),lesson_sections(section_type,content),lesson_parent_questions(position,question_uz,expected_answer)').eq('is_template', true));
    rows.sort((a, b) => ((a.units?.position || 0) - (b.units?.position || 0)) || (a.position - b.position));
    if (rows.length) TOPICS = rows.map(r => ({id: r.id, t: r.title, unit: r.units?.title || '',
      ask: (r.lesson_parent_questions || []).sort((a, b) => a.position - b.position).map(x => [x.question_uz, x.expected_answer || '']),
      quiz: ((r.lesson_sections || []).find(s => s.section_type === 'quiz')?.content?.questions) || []}));
    loadCurriculum.done = true;
  } catch (e) { console.warn('curriculum', e); }
}
const safe = async (p, d = []) => { try { return await q(p); } catch (e) { console.warn(e); return d; } };
const AUD_UZ = {school: 'Butun maktab', teachers: "O'qituvchilar", parents: 'Ota-onalar', group: 'Guruh', class: 'Sinf'};
const ATT_UZ = {present: 'Keldi', late: 'Kechikdi', absent: 'Kelmadi'};
function annTarget(a) {
  if (a.audience === 'group') return (D.groups || []).find(g => g.id === a.target_id)?.name || D.group?.name || 'Guruh';
  if (a.audience === 'class') return (D.classes || []).find(c => c.id === a.target_id)?.name || 'Sinf';
  return AUD_UZ[a.audience] || '';
}
function annCard(a) {
  return `<div class="card stack"><div class="between"><b>📢 ${esc(a.title)}</b><span class="pill p-info">${esc(annTarget(a))}</span></div><div style="white-space:pre-wrap">${esc(a.body)}</div><div class="muted" style="font-size:12px">${fmt(a.created_at)}${D.P && D.P[a.author_id] ? ' · ' + esc(D.P[a.author_id].full_name) : ''}</div></div>`;
}
const sessionEnd = s => new Date(s.starts_at).getTime() + (s.duration_minutes || 45) * 6e4;
function liveCard(s, staffMode, label) {
  const g = (D.groups || []).find(x => x.id === s.group_id) || D.group;
  let att = '';
  if (staffMode) {
    const st = groupStudents(s.group_id);
    const rec = (D.att || []).filter(a => a.session_id === s.id);
    att = st.length ? `<details><summary style="cursor:pointer" class="muted">Davomat: ${rec.filter(a => a.status !== 'absent').length}/${st.length} keldi</summary><div class="stack" style="margin-top:8px">${st.map(x => { const a = rec.find(r => r.student_id === x.profile_id);
      return `<div class="between"><span>${esc(D.P[x.profile_id]?.full_name)}</span><div class="row" style="gap:6px">${['present', 'late', 'absent'].map(k => `<button class="btn sm ${a?.status === k ? 'p' : 'o'}" data-act="att" data-id="${s.id}" data-st="${x.profile_id}" data-k="${k}">${ATT_UZ[k]}</button>`).join('')}</div></div>`; }).join('')}</div></details>` : '';
  }
  const live = Date.now() >= new Date(s.starts_at).getTime() - 15 * 6e4 && Date.now() <= sessionEnd(s);
  return `<div class="card stack">${label ? `<div class="muted" style="font-size:12px;font-weight:600;letter-spacing:.06em">${label}</div>` : ''}<div class="between"><b>${fmt(s.starts_at)} · ${s.duration_minutes || 45} daqiqa</b><span class="pill ${live ? 'p-ok' : 'p-info'}">${live ? 'Hozir' : esc(g?.name || '')}</span></div>${s.google_meet_url ? `<a class="btn sm g" style="justify-self:start" href="${esc(s.google_meet_url)}" target="_blank" rel="noopener">🎥 Google Meet'ga kirish</a>` : `<span class="muted" style="font-size:13px">Meet havolasi hali qo'shilmagan</span>`}${att}</div>`;
}

let me = null, view = null, D = {}, busy = false;
const ROLE_UZ = {head_teacher:'Head teacher', teacher:"O'qituvchi", student:"O'quvchi", parent:'Ota-ona'};

async function q(p) { const { data, error } = await p; if (error) { console.error(error); throw error; } return data; }
async function fn(body) {
  const { data: { session } } = await sb.auth.getSession();
  const r = await fetch(SB_URL + '/functions/v1/create-user', {method:'POST', headers:{'Content-Type':'application/json', apikey:SB_KEY, Authorization:'Bearer ' + session.access_token}, body: JSON.stringify(body)});
  const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Xato'); return j;
}

/* AI tekshiruv (Gemini, server tomonda). Kalit bo'lmasa jim o'tadi. */
async function aiCheck(submissionId, quiet) {
  try {
    const { data: { session } } = await sb.auth.getSession();
    const r = await fetch(SB_URL + '/functions/v1/ai-check', {method: 'POST', headers: {'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + session.access_token}, body: JSON.stringify({submission_id: submissionId})});
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { if (!quiet) toast(j.error || 'AI tekshira olmadi'); return null; }
    return j;
  } catch (e) { if (!quiet) toast('AI bilan aloqa yo\'q'); return null; }
}

/* ---------------- loading ---------------- */
async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { me = null; return render(); }
  const p = await q(sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle());
  if (!p) { await sb.auth.signOut(); me = null; return render(); }
  me = p; await load();
}
async function load() {
  $('#app').innerHTML = '<div class="phone"><div class="empty">Yuklanmoqda…</div></div>';
  try {
    await loadCurriculum();
    if (me.role === 'head_teacher' || me.role === 'teacher') await loadStaff();
    else if (me.role === 'student') await loadStudent();
    else await loadParent();
  } catch (e) { $('#app').innerHTML = `<div class="phone"><div class="empty">Ma'lumot yuklanmadi: ${esc(e.message)}<br><button class="btn s" data-act="reload" style="margin-top:12px">Qayta urinish</button></div></div>`; return; }
  render();
}
async function loadStaff() {
  const [classes, ct, groups, students, profiles, assignments, subs, scores] = await Promise.all([
    q(sb.from('classes').select('*').order('name')),
    q(sb.from('class_teachers').select('*')),
    q(sb.from('groups').select('*').order('name')),
    q(sb.from('students').select('*')),
    q(sb.from('profiles').select('id, role, login, full_name')),
    q(sb.from('assignments').select('*').order('created_at', {ascending:false})),
    q(sb.from('submissions').select('*, submission_grades(*)').order('submitted_at', {ascending:false})),
    q(sb.rpc('my_student_scores'))
  ]);
  const [lessons, feedback, ann, sessions, att] = await Promise.all([
    q(sb.from('lessons').select('*, units(title,position), lesson_sections(*)').order('position')),
    me.role === 'head_teacher' ? q(sb.from('feedback').select('*').order('created_at', {ascending:false})) : [],
    safe(sb.from('announcements').select('*').order('created_at', {ascending:false}).limit(30)),
    safe(sb.from('live_sessions').select('*').order('starts_at')),
    safe(sb.from('attendance').select('*'))
  ]);
  const P = Object.fromEntries(profiles.map(x => [x.id, x]));
  const score = Object.fromEntries(scores.map(x => [x.student_id, x]));
  const [wt, wtr, badges, sbadges, boxes, weekly, hof] = await Promise.all([
    safe(sb.from('watching_time').select('*').order('week_start', {ascending:false})),
    safe(sb.from('watching_time_results').select('*')),
    safe(sb.from('badges').select('*')),
    safe(sb.from('student_badges').select('*').order('awarded_at', {ascending:false})),
    safe(sb.from('mystery_box_openings').select('*, mystery_box_rewards(title_uz)').order('opened_at', {ascending:false})),
    safe(sb.from('weekly_group_leaderboard').select('*').order('week_start', {ascending:false}).limit(200)),
    safe(sb.from('hall_of_fame').select('*').order('month', {ascending:false}).limit(30))
  ]);
  D = {classes, ct, groups, students, P, assignments, subs, score, lessons, feedback, ann, sessions, att, wt, wtr, badges, sbadges, boxes, weekly, hof};
}
async function loadStudent() {
  const st = await q(sb.from('students').select('*').eq('profile_id', me.id).maybeSingle());
  const group = st ? await q(sb.from('groups').select('*').eq('id', st.group_id).maybeSingle()) : null;
  const [assignments, subs, grades, streak, todayCh, board] = await Promise.all([
    q(sb.from('assignments').select('*').order('due_at')),
    q(sb.from('submissions').select('*').eq('student_id', me.id)),
    q(sb.from('my_grades').select('*').eq('student_id', me.id)),
    q(sb.from('streaks').select('*').eq('student_id', me.id).maybeSingle()),
    q(sb.from('daily_challenges').select('*').eq('student_id', me.id).eq('challenge_date', todayISO()).maybeSingle()),
    group ? q(sb.rpc('group_leaderboard', {p_group_id: group.id})) : []
  ]);
  const [lessons, ann, sessions] = await Promise.all([
    q(sb.from('lessons').select('*, lesson_sections(*)').order('position')),
    safe(sb.from('announcements').select('*').order('created_at', {ascending:false}).limit(10)),
    group ? safe(sb.from('live_sessions').select('*').eq('group_id', group.id).gte('starts_at', new Date(Date.now() - 3 * 36e5).toISOString()).order('starts_at').limit(5)) : []
  ]);
  const [wt, wtr, badges, sbadges, boxes] = await Promise.all([
    safe(sb.from('watching_time').select('*').order('week_start', {ascending:false}).limit(10)),
    safe(sb.from('watching_time_results').select('*').eq('student_id', me.id)),
    safe(sb.from('badges').select('*')),
    safe(sb.from('student_badges').select('*').eq('student_id', me.id)),
    safe(sb.from('mystery_box_openings').select('*, mystery_box_rewards(title_uz, description)').eq('student_id', me.id).order('opened_at', {ascending:false}))
  ]);
  D = {group, assignments, subs, grades, streak, todayCh, board, lessons, ann, sessions, wt, wtr, badges, sbadges, boxes};
}
async function loadParent() {
  const links = await q(sb.from('parent_students').select('student_id').eq('parent_id', me.id));
  const ids = links.map(l => l.student_id);
  if (!ids.length) { D = {kids: []}; return; }
  const [profiles, students] = await Promise.all([
    q(sb.from('profiles').select('id, full_name').in('id', ids)),
    q(sb.from('students').select('*').in('profile_id', ids))
  ]);
  const kids = students.map(s => ({...s, name: (profiles.find(p => p.id === s.profile_id) || {}).full_name || ''}));
  const active = (D.active && kids.find(k => k.profile_id === D.active)) ? D.active : kids[0].profile_id;
  const kid = kids.find(k => k.profile_id === active);
  const [group, assignments, subs, grades, streak, board] = await Promise.all([
    q(sb.from('groups').select('*').eq('id', kid.group_id).maybeSingle()),
    q(sb.from('assignments').select('*').eq('target_group_id', kid.group_id).order('due_at', {ascending:false})),
    q(sb.from('submissions').select('*').eq('student_id', active)),
    q(sb.from('my_grades').select('*').eq('student_id', active)),
    q(sb.from('streaks').select('*').eq('student_id', active).maybeSingle()),
    q(sb.rpc('group_leaderboard', {p_group_id: kid.group_id}))
  ]);
  const [ann, sessions, att] = await Promise.all([
    safe(sb.from('announcements').select('*').order('created_at', {ascending:false}).limit(10)),
    safe(sb.from('live_sessions').select('*').eq('group_id', kid.group_id).order('starts_at')),
    safe(sb.from('attendance').select('*').eq('student_id', active))
  ]);
  const [badges, sbadges] = await Promise.all([safe(sb.from('badges').select('*')), safe(sb.from('student_badges').select('*').eq('student_id', active))]);
  D = {kids, active, kid, group, assignments, subs, grades, streak, board, ann, sessions, att, badges, sbadges};
}

/* ---------------- staff helpers ---------------- */
const myClasses = () => me.role === 'head_teacher' ? D.classes : D.classes.filter(c => D.ct.some(x => x.class_id === c.id && x.teacher_id === me.id));
const classGroups = cid => D.groups.filter(g => g.class_id === cid);
const myGroups = () => myClasses().flatMap(c => classGroups(c.id));
const groupStudents = gid => D.students.filter(s => s.group_id === gid);
const classTeachers = cid => D.ct.filter(x => x.class_id === cid).map(x => D.P[x.teacher_id]).filter(Boolean);
const pending = () => D.subs.filter(s => (s.status === 'submitted' || s.status === 'ai_checked') && myGroups().some(g => D.assignments.find(a => a.id === s.assignment_id && a.target_group_id === g.id)));
function stStatus(sid, gid) {
  const due = D.assignments.filter(a => a.target_group_id === gid && a.due_at && new Date(a.due_at) < new Date());
  const missed = due.filter(a => !D.subs.some(s => s.assignment_id === a.id && s.student_id === sid)).length;
  const k = (D.score[sid] || {}).streak || 0;
  if (missed >= 2 || (missed && !k)) return ['bad', missed + ' ta vazifa topshirilmagan'];
  if (missed === 1) return ['warn', '1 ta vazifa orqada'];
  if (!k) return ['warn', 'Daily Challenge qilmayapti'];
  return ['ok', "Reja bo'yicha"];
}

/* ---------------- views ---------------- */
function render() {
  if (!me) { $('#app').innerHTML = loginView(); return; }
  $('#app').innerHTML = (me.role === 'head_teacher' || me.role === 'teacher') ? staff() : me.role === 'student' ? studentView() : parentView();
}
function loginView() {
  return `<div class="login"><section class="hero">
    <div class="brand" style="color:#fff">${STAR}<div><b>NORTHSTAR</b><div style="font-size:11px;letter-spacing:.14em;color:#9AB9FF;font-weight:600">SMARTUM INTERNATIONAL SCHOOL</div></div></div>
    <div><h1>Har bir qadam — yangi yulduz sari.</h1><p>Darslar, uy vazifalari, natijalar va reyting — o'qituvchi, o'quvchi va ota-ona uchun bitta joyda.</p></div>
    <div style="color:#9AB9FF;font-size:13px">© Smartum International School</div>
  </section><div class="form"><form id="loginForm" novalidate>
    <div><h2 style="font-size:28px">Xush kelibsiz</h2><p class="muted" style="margin:4px 0 0">Login va parolni kiriting — panel rolingizga qarab ochiladi.</p></div>
    <div class="field"><label for="lg">Login</label><input id="lg" autocomplete="username" autocapitalize="none" required></div>
    <div class="field"><label for="pw">Parol</label><input id="pw" type="password" autocomplete="current-password" required></div>
    <div class="err" id="lerr"></div>
    <button class="btn p" type="submit" id="lbtn">Kirish</button>
    <p class="muted" style="font-size:13px;margin:0">Login yo'qmi yoki parolni unutdingizmi? O'qituvchingizga murojaat qiling.</p>
  </form></div></div>`;
}

function staff() {
  const head = me.role === 'head_teacher';
  const items = head
    ? [['home','Bosh sahifa'],['teachers',"O'qituvchilar"],['classes','Sinflar'],['lessons','Namuna darslar'],['live','Jonli darslar'],['homework','Uy vazifalar'],['check','Tekshirish'],['watch','Watching Time'],['announce',"E'lonlar"],['awards','Nishonlar'],['rating','Reyting'],['feedback','Fikrlar']]
    : [['home','Bosh sahifa'],['classes','Mening sinflarim'],['lessons','Darslarim'],['live','Jonli darslar'],['homework','Uy vazifalar'],['check','Tekshirish'],['watch','Watching Time'],['announce',"E'lonlar"],['awards','Nishonlar'],['rating','Reyting']];
  if (!view || !items.some(i => i[0] === view)) view = 'home';
  const pc = pending().length;
  const nav = items.map(([k, l]) => `<button class="nav ${view === k ? 'on' : ''}" data-nav="${k}">${l}${k === 'check' && pc ? `<span class="pill p-warn">${pc}</span>` : ''}</button>`).join('');
  const body = ({home: head ? headHome : teacherHome, teachers: headTeachers, classes: classesView, lessons: lessonsView, homework: homeworkView, check: checkView, rating: ratingView, feedback: feedbackView, announce: announceView, live: liveView, watch: watchView, awards: awardsView})[view]();
  return `<div class="shell"><aside class="side"><div class="brand" style="color:var(--primary)">${STAR}<b>NORTHSTAR</b></div>${nav}
    <div class="me"><b>${esc(me.full_name)}</b><div class="muted">${ROLE_UZ[me.role]} · ${esc(me.login)}</div><div class="row" style="margin-top:8px;gap:6px"><button class="btn sm o" data-act="pwOpen">Parol</button><button class="btn sm o" data-act="tgLink" title="Telegram'ga ulash">📲</button><button class="btn sm o" data-act="logout">Chiqish</button></div></div></aside>
    <div class="topbar">${nav}<button class="nav" data-act="logout">Chiqish</button></div>
    <main class="main">${body}</main></div>${FB_BTN}`;
}
const FB_BTN = `<button class="btn g fb-btn" data-act="fbOpen" aria-label="Fikr bildirish">💬 Fikr bildirish</button>`;
const SEC_UZ = {warm_up:'Warm-up', vocabulary:'Vocabulary', grammar:'Grammar', reading:'Reading', listening:'Listening', speaking:'Speaking', writing:'Writing', quiz:'Quiz'};
function lessonCard(l, actions) {
  return `<div class="card stack"><div class="between"><b>${esc(l.title)}</b>${l.is_template ? '<span class="pill p-info">Namuna</span>' : ''}</div>
    <div class="muted" style="font-size:13px">${(l.lesson_sections || []).length} bo'lim · ${(l.lesson_sections || []).sort((a, b) => a.position - b.position).map(s => SEC_UZ[s.section_type]).join(', ')}</div>
    <div class="row"><button class="btn sm s" data-act="openLesson" data-id="${l.id}">Ochish</button>${actions || ''}</div></div>`;
}
function lessonsView() {
  const head = me.role === 'head_teacher';
  const mine = D.lessons.filter(l => l.owner_id === me.id && !l.is_template);
  const tpl = D.lessons.filter(l => l.is_template);
  return `<div class="between"><h1 style="font-size:28px">${head ? 'Namuna darslar' : 'Darslarim'}</h1><button class="btn p" data-act="newLesson">+ Dars yaratish</button></div>
  <p class="muted" style="margin:0">${head ? "Namuna darslar barcha o'qituvchilarga ochiq — ular nusxa olib, o'zlariga moslashtiradi." : "Darslaringiz o'quvchilaringizga doim ochiq. Namuna darslardan nusxa olishingiz mumkin."}</p>
  ${head ? '' : `<h2 style="font-size:18px">Mening darslarim (${mine.length})</h2>${mine.map(l => lessonCard(l, `<button class="btn sm t" data-act="delLesson" data-id="${l.id}">O'chirish</button>`)).join('') || `<div class="empty">Hali dars yo'q. Pastdagi namunalardan nusxa oling yoki yangi dars yarating.</div>`}`}
  <h2 style="font-size:18px">Namuna darslar · A1 (${tpl.length})</h2>
  ${(() => { const units = [...new Map(tpl.map(l => [l.unit_id, l.units || {}])).entries()].sort((a, b) => (a[1].position || 0) - (b[1].position || 0));
    return units.map(([uid, u], i) => { const ls = tpl.filter(l => l.unit_id === uid).sort((a, b) => a.position - b.position);
      return `<details class="card" ${i === 0 ? 'open' : ''}><summary style="cursor:pointer;font-weight:700">${esc(u.title || 'Unit')} <span class="muted" style="font-weight:500">· ${ls.length} dars</span></summary><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));margin-top:12px">${ls.map(l => lessonCard(l, head ? '' : (mine.some(m => m.copied_from === l.id) ? '<span class="pill p-ok">Nusxa olingan</span>' : `<button class="btn sm p" data-act="copyLesson" data-id="${l.id}">Nusxa olish</button>`))).join('')}</div></details>`; }).join('') || `<div class="empty">Namuna dars yo'q</div>`; })()}`;
}
function feedbackView() {
  return `<h1 style="font-size:28px">Fikrlar</h1><p class="muted" style="margin:0">Foydalanuvchilar «Fikr bildirish» tugmasi orqali yozgan takliflar.</p>
  ${D.feedback.length ? D.feedback.map(f => `<div class="card stack"><div class="between"><b>${esc(D.P[f.author_id]?.full_name || 'Foydalanuvchi')}</b><span class="muted" style="font-size:13px">${fmt(f.created_at)} · ${esc(f.page || '')}</span></div><div style="white-space:pre-wrap">${esc(f.body)}</div><div>${f.status === 'done' ? '<span class="pill p-ok">Bajarildi</span>' : `<button class="btn sm s" data-act="fbDone" data-id="${f.id}">Bajarildi deb belgilash</button>`}</div></div>`).join('') : `<div class="empty">Hali fikr yo'q.</div>`}`;
}
function announceView() {
  return `<div class="between"><h1 style="font-size:28px">E'lonlar</h1><button class="btn p" data-act="newAnn">+ E'lon yozish</button></div>
  <p class="muted" style="margin:0">E'lon tanlangan guruh/sinf o'quvchilari va ota-onalarining bosh sahifasida chiqadi.</p>
  ${(D.ann || []).length ? D.ann.map(annCard).join('') : `<div class="empty">Hali e'lon yo'q.</div>`}`;
}
function liveView() {
  const gids = new Set(myGroups().map(g => g.id));
  const ss = (D.sessions || []).filter(s => gids.has(s.group_id));
  const up = ss.filter(s => sessionEnd(s) >= Date.now());
  const past = ss.filter(s => sessionEnd(s) < Date.now()).reverse().slice(0, 10);
  return `<div class="between"><h1 style="font-size:28px">Jonli darslar</h1><button class="btn p" data-act="newLive">+ Dars rejalashtirish</button></div>
  <p class="muted" style="margin:0">Google Meet havolasini qo'shing — o'quvchi va ota-ona bosh sahifasida "Kirish" tugmasi chiqadi. Davomatni dars ichida belgilang.</p>
  <h2 style="font-size:18px">Kelgusi darslar (${up.length})</h2>${up.map(s => liveCard(s, true)).join('') || `<div class="empty">Rejalashtirilgan dars yo'q.</div>`}
  ${past.length ? `<h2 style="font-size:18px">O'tgan darslar</h2>${past.map(s => liveCard(s, true)).join('')}` : ''}`;
}
/* ---------- Watching Time, nishonlar, Mystery Box, haftalik natijalar ---------- */
const weekStart = () => { const d = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Tashkent'})); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toLocaleDateString('en-CA'); };
const ytEmbed = u => { const m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? 'https://www.youtube.com/embed/' + m[1] : ''; };
const badgeOf = id => (D.badges || []).find(b => b.id === id) || {};
function badgeChips(list) {
  if (!list.length) return `<span class="muted" style="font-size:13px">Hali nishon yo'q</span>`;
  return `<div class="row" style="gap:6px">${list.map(sb => { const b = badgeOf(sb.badge_id); return `<span class="pill p-info" title="${esc(b.description || '')}">${esc(b.icon || '🏅')} ${esc(b.name_uz || '')}</span>`; }).join('')}</div>`;
}
function watchView() {
  const cids = new Set(myClasses().map(c => c.id));
  const list = (D.wt || []).filter(w => !w.class_id || cids.has(w.class_id) || me.role === 'head_teacher');
  return `<div class="between"><h1 style="font-size:28px">Watching Time</h1><button class="btn p" data-act="newWatch">+ Video qo'shish</button></div>
  <p class="muted" style="margin:0">Haftalik video + savollar. O'quvchi ko'rib, javob beradi: 60% dan yuqori natija — haftalik reytingga +3 bonus ball.</p>
  ${list.length ? list.map(w => { const res = (D.wtr || []).filter(r => r.watching_time_id === w.id); const cls = (D.classes || []).find(c => c.id === w.class_id);
    const st = (D.students || []).filter(s => !w.class_id || (D.groups.find(g => g.id === s.group_id) || {}).class_id === w.class_id);
    const avg = res.length ? Math.round(res.reduce((a, r) => a + Number(r.score_percent), 0) / res.length) : 0;
    return `<div class="card stack"><div class="between"><b>🎬 ${esc(w.title)}</b><span class="pill p-info">${esc(cls?.name || 'Hamma sinflar')} · ${fmt(w.week_start).split(',')[0]} haftasi</span></div>
    <div class="muted" style="font-size:13px">${(w.questions || []).length} ta savol · ${res.length}/${st.length} ko'rdi${res.length ? ' · o\'rtacha ' + avg + '%' : ''}</div>
    ${res.length ? `<details><summary class="muted" style="cursor:pointer">Natijalar</summary><div class="stack" style="margin-top:8px">${res.sort((a, b) => b.score_percent - a.score_percent).map(r => `<div class="between"><span>${esc(D.P[r.student_id]?.full_name)}</span><span class="num">${Number(r.score_percent)}% · +${r.bonus_points || 0}</span></div>`).join('')}</div></details>` : ''}</div>`; }).join('') : `<div class="empty">Hali video qo'shilmagan.</div>`}`;
}
function awardsView() {
  const st = myGroups().flatMap(g => groupStudents(g.id));
  const ids = new Set(st.map(s => s.profile_id));
  const boxes = (D.boxes || []).filter(b => ids.has(b.student_id));
  const manual = (D.badges || []).filter(b => ['helper', 'speaker', 'homework_star'].includes(b.code));
  return `<h1 style="font-size:28px">Nishonlar va Mystery Box</h1>
  <p class="muted" style="margin:0">Streak, mukammal challenge, 90+ uy vazifa va Watching Time nishonlari avtomatik beriladi. Qolganini shu yerdan bering. Har nishon haftalik reytingga bonus qo'shadi.</p>
  <section class="card stack"><h2 style="font-size:18px">Nishon berish</h2>
  ${st.length ? `<form id="badgeForm" class="row"><select id="bdS" style="flex:1;min-width:180px">${st.map(s => `<option value="${s.profile_id}">${esc(D.P[s.profile_id]?.full_name)}</option>`).join('')}</select><select id="bdB" style="flex:1;min-width:180px">${manual.map(b => `<option value="${b.id}">${esc(b.icon)} ${esc(b.name_uz)} (+${b.bonus_points})</option>`).join('')}</select><button class="btn p" type="submit">Berish</button></form>` : `<div class="empty">O'quvchi yo'q</div>`}</section>
  <section class="card stack"><h2 style="font-size:18px">O'quvchilar nishonlari</h2>${st.map(s => `<div class="stack" style="border-top:1px solid var(--border);padding-top:8px"><b>${esc(D.P[s.profile_id]?.full_name)}</b>${badgeChips((D.sbadges || []).filter(b => b.student_id === s.profile_id))}</div>`).join('') || `<div class="empty">—</div>`}</section>
  <section class="card stack"><h2 style="font-size:18px">🎁 Mystery Box sovg'alari</h2><p class="muted" style="margin:0;font-size:13px">O'quvchi 7 kunlik streakda haftada 1 marta quti ochadi. Sovg'ani berganingizda belgilang.</p>
  ${boxes.length ? boxes.map(b => `<div class="between"><span><b>${esc(D.P[b.student_id]?.full_name)}</b> · ${esc(b.mystery_box_rewards?.title_uz || '')} <span class="muted" style="font-size:12px">${fmt(b.opened_at)}</span></span>${b.is_claimed ? '<span class="pill p-ok">Berildi</span>' : `<button class="btn sm s" data-act="boxClaim" data-id="${b.id}">Berildi</button>`}</div>`).join('') : `<div class="empty">Hali quti ochilmagan.</div>`}</section>`;
}
function weeklyHistory() {
  const gids = new Set(myGroups().map(g => g.id));
  const rows = (D.weekly || []).filter(r => gids.has(r.group_id) || me.role === 'head_teacher');
  const weeks = [...new Set(rows.map(r => r.week_start))].slice(0, 4);
  const hof = (D.hof || []).filter(h => myClasses().some(c => c.id === h.class_id));
  return `<section class="card stack"><div class="between"><h2 style="font-size:18px">Saqlangan haftalar</h2><button class="btn sm s" data-act="saveWeek">Bu haftani hozir saqlash</button></div>
  <p class="muted" style="margin:0;font-size:13px">Har yakshanba 23:55 da avtomatik saqlanadi (bonuslar bilan). Oy oxirida har sinfning top-3 i Hall of Fame'ga tushadi.</p>
  ${weeks.length ? weeks.map(w => `<details ${w === weeks[0] ? 'open' : ''}><summary style="cursor:pointer;font-weight:600">${fmt(w).split(',')[0]} haftasi</summary><div class="lb" style="margin-top:8px">${rows.filter(r => r.week_start === w).sort((a, b) => a.class_rank - b.class_rank).slice(0, 10).map(r => `<div class="lb-row"><span class="medal" style="background:${medal(r.class_rank - 1)}">${r.class_rank}</span><span class="n">${esc(r.full_name)}</span><span class="muted" style="font-size:12px">${r.bonus_total ? '+' + r.bonus_total + ' bonus' : ''}</span><b class="num">${Number(r.total_score)}</b></div>`).join('')}</div></details>`).join('') : `<div class="empty">Hali saqlangan hafta yo'q.</div>`}
  ${hof.length ? `<h3 style="font-size:16px;margin-top:8px">🏛 Hall of Fame</h3>${hof.map(h => `<div class="between"><span>${['🥇','🥈','🥉'][h.rank - 1] || h.rank} ${esc(D.P[h.student_id]?.full_name || '')}</span><span class="muted">${OYLAR[new Date(h.month).getMonth()]} · ${Number(h.score)}</span></div>`).join('')}` : ''}</section>`;
}
function watchCard() {
  const done = new Set((D.wtr || []).map(r => r.watching_time_id));
  const w = (D.wt || []).find(x => !done.has(x.id));
  if (!w) return '';
  return `<div class="card stack"><div class="muted" style="font-size:12px;font-weight:600;letter-spacing:.06em">🎬 WATCHING TIME · BONUS +3</div><b>${esc(w.title)}</b><button class="btn s" data-act="watchOpen" data-id="${w.id}">Ko'rish va javob berish</button></div>`;
}
function rewardsCard() {
  const k = D.streak && D.streak.last_completed_date >= new Date(Date.now() - 864e5).toLocaleDateString('en-CA', {timeZone:'Asia/Tashkent'}) ? D.streak.current_streak : 0;
  const lastBox = (D.boxes || [])[0]; const recent = lastBox && (Date.now() - new Date(lastBox.opened_at)) < 7 * 864e5;
  const can = k >= 7 && !recent;
  return `<div class="card stack"><div class="between"><b>🏅 Nishonlarim</b><span class="muted">${(D.sbadges || []).length} ta</span></div>${badgeChips(D.sbadges || [])}
  <div class="between" style="border-top:1px solid var(--border);padding-top:10px"><div><b>🎁 Mystery Box</b><div class="muted" style="font-size:12px">${can ? 'Quti tayyor!' : recent ? 'Bu hafta ochildi: ' + esc(lastBox.mystery_box_rewards?.title_uz || '') : `7 kunlik streak kerak (hozir ${k})`}</div></div>${can ? '<button class="btn sm g" data-act="boxOpen">Ochish</button>' : ''}</div></div>`;
}
function openLesson(id) {
  const l = D.lessons.find(x => x.id === id); if (!l) return;
  const secs = (l.lesson_sections || []).sort((a, b) => a.position - b.position);
  modal(`<div class="between"><h2>${esc(l.title)}</h2><button class="btn sm o" data-act="close">Yopish</button></div>${l.objective ? `<p class="muted" style="margin:0">${esc(l.objective)}</p>` : ''}
  ${secs.map(s => `<div class="stack" style="border-top:1px solid var(--border);padding-top:10px"><span class="pill p-info" style="justify-self:start">${SEC_UZ[s.section_type]}</span><div style="white-space:pre-wrap">${esc(s.content?.text || '')}</div>${Array.isArray(s.content?.questions) ? `<ol style="margin:0;padding-left:20px">${s.content.questions.map(x => `<li>${esc(x.q)} <span class="muted">— ${esc(x.o?.[x.a] ?? '')}</span></li>`).join('')}</ol>` : ''}${s.content?.url ? `<a href="${esc(s.content.url)}" target="_blank" rel="noopener">Video / material ↗</a>` : ''}</div>`).join('')}`);
}
function kpi(l, v, color) { return `<div class="card kpi"><div class="l">${l}</div><div class="v num" ${color ? `style="color:${color}"` : ''}>${v}</div></div>`; }
function teacherHome() {
  const st = myGroups().flatMap(g => groupStudents(g.id).map(s => ({s, g})));
  const c = {ok:0, warn:0, bad:0}; const rows = [];
  st.forEach(({s, g}) => { const x = stStatus(s.profile_id, g.id); c[x[0]]++; if (x[0] !== 'ok') rows.push({s, g, x}); });
  const act = st.filter(({s}) => Number((D.score[s.profile_id] || {}).score || 0) > 0);
  const avg = act.length ? Math.round(act.reduce((a, {s}) => a + Number(D.score[s.profile_id].score), 0) / act.length) : 0;
  return `<div class="between"><div><h1 style="font-size:28px">Xayrli kun, ${esc(me.full_name)}</h1><p class="muted" style="margin:4px 0 0">${myClasses().length} sinf · ${myGroups().length} guruh · ${pending().length} ta ish tekshirishni kutmoqda</p></div>
    <div class="row"><button class="btn s" data-nav="classes">+ O'quvchi qo'shish</button><button class="btn p" data-act="newHw">+ Uy vazifa berish</button></div></div>
    <div class="kpis">${kpi("O'quvchilar", st.length)}${kpi('Tekshirilmagan', pending().length, 'var(--warn)')}<div class="card kpi"><div class="l">O'rtacha ball</div><div class="v num">${avg}</div><div class="muted" style="font-size:12px">${act.length} ta faol o'quvchi bo'yicha</div></div>
      <div class="card kpi"><div class="l">Svetofor</div><div class="row num" style="margin-top:8px"><span class="pill p-ok" title="Reja bo'yicha">${c.ok}</span><span class="pill p-warn" title="E'tibor kerak: 1 ta vazifa orqada yoki Daily Challenge qilmayapti">${c.warn}</span><span class="pill p-bad" title="Orqada: 2+ vazifa topshirilmagan">${c.bad}</span></div><div class="muted" style="font-size:12px;margin-top:6px">yashil — reja bo'yicha · sariq — e'tibor · qizil — orqada</div></div></div>
    <section class="card stack"><h2 style="font-size:18px">E'tibor kerak bo'lgan o'quvchilar</h2>
    ${rows.length ? `<div class="tbl-wrap"><table><tr><th>O'quvchi</th><th>Guruh</th><th>Holat</th><th>Ball</th><th>Streak</th></tr>${rows.map(r => `<tr><td><b>${esc(D.P[r.s.profile_id]?.full_name)}</b></td><td>${esc(r.g.name)}</td><td><span class="pill p-${r.x[0]}">${esc(r.x[1])}</span></td><td class="num">${(D.score[r.s.profile_id] || {}).score ?? '—'}</td><td class="num">${(D.score[r.s.profile_id] || {}).streak ?? 0}</td></tr>`).join('')}</table></div>` : `<div class="empty">${st.length ? "Hamma o'quvchi reja bo'yicha." : "Hali o'quvchi yo'q. «Mening sinflarim» bo'limida qo'shing."}</div>`}</section>`;
}
function headHome() {
  const teachers = Object.values(D.P).filter(p => p.role === 'teacher');
  const scores = Object.values(D.score).sort((a, b) => b.score - a.score);
  const avg = scores.length ? Math.round(scores.reduce((a, x) => a + Number(x.score), 0) / scores.length) : 0;
  const slow = teachers.map(t => ({t, n: D.subs.filter(s => s.status !== 'approved' && s.status !== 'returned' && D.assignments.find(a => a.id === s.assignment_id && a.created_by === t.id)).length})).filter(x => x.n);
  return `<h1 style="font-size:28px">Maktab holati</h1>
    <div class="kpis">${kpi("O'quvchilar", D.students.length)}${kpi("O'qituvchilar", teachers.length)}${kpi('Sinflar', D.classes.length)}${kpi("O'rtacha ball", avg)}</div>
    ${!teachers.length ? `<div class="card stack"><b>Boshlash uchun 3 qadam</b><div>1. «O'qituvchilar» bo'limida o'qituvchi qo'shing.</div><div>2. «Sinflar» bo'limida sinf yarating va o'qituvchi biriktiring.</div><div>3. O'qituvchi guruh va o'quvchilarni qo'shadi.</div></div>` : ''}
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
      <section class="card stack"><h2 style="font-size:18px">Maktab bo'yicha top-5</h2><div class="lb">${scores.slice(0, 5).map((x, i) => `<div class="lb-row"><span class="medal" style="background:${medal(i)}">${i + 1}</span><span class="n">${esc(x.full_name)}</span><b class="num">${x.score}</b></div>`).join('') || `<div class="empty">Hali ma'lumot yo'q</div>`}</div></section>
      <section class="card stack"><h2 style="font-size:18px">Ogohlantirishlar</h2>${slow.map(x => `<div class="between"><span>${esc(x.t.full_name)}</span><span class="pill p-warn">${x.n} ta tekshirilmagan ish</span></div>`).join('') || `<div class="empty">Ogohlantirish yo'q</div>`}</section></div>`;
}
function headTeachers() {
  const ts = Object.values(D.P).filter(p => p.role === 'teacher');
  return `<div class="between"><h1 style="font-size:28px">O'qituvchilar</h1><button class="btn p" data-act="newTeacher">+ O'qituvchi qo'shish</button></div>
  <div class="card tbl-wrap">${ts.length ? `<table><tr><th>Ism</th><th>Login</th><th>Sinflari</th><th>O'quvchilar</th></tr>${ts.map(t => { const cs = D.classes.filter(c => D.ct.some(x => x.class_id === c.id && x.teacher_id === t.id)); const n = cs.flatMap(c => classGroups(c.id)).flatMap(g => groupStudents(g.id)).length;
    return `<tr><td><b>${esc(t.full_name)}</b></td><td class="muted">${esc(t.login)}</td><td>${cs.map(c => esc(c.name)).join(', ') || '—'}</td><td class="num">${n}</td></tr>`; }).join('')}</table>` : `<div class="empty">Hali o'qituvchi qo'shilmagan.</div>`}</div>`;
}
function classesView() {
  const head = me.role === 'head_teacher';
  const cs = myClasses();
  return `<div class="between"><h1 style="font-size:28px">${head ? 'Sinflar' : 'Mening sinflarim'}</h1>${head ? '<button class="btn p" data-act="newClass">+ Sinf yaratish</button>' : ''}</div>
  ${cs.length ? cs.map(c => `<section class="card stack"><div class="between"><div><h2 style="font-size:20px">${esc(c.name)}</h2><div class="muted" style="font-size:13px">${classTeachers(c.id).map(t => esc(t.full_name)).join(', ') || "O'qituvchi biriktirilmagan"}</div></div>
     <div class="row">${head ? `<button class="btn sm s" data-act="assignTeacher" data-id="${c.id}">O'qituvchi biriktirish</button>` : ''}<button class="btn sm o" data-act="newGroup" data-id="${c.id}">+ Guruh</button></div></div>
     ${classGroups(c.id).map(g => `<div class="stack" style="border-top:1px solid var(--border);padding-top:12px"><div class="between"><b>${esc(g.name)}</b><div class="row"><span class="muted" style="font-size:13px">Mavzu: ${esc(TOPICS[g.current_topic % TOPICS.length].t)}</span><button class="btn sm o" data-act="nextTopic" data-id="${g.id}">Keyingi mavzu</button><button class="btn sm s" data-act="newStudent" data-id="${g.id}">+ O'quvchi</button></div></div>
       ${groupStudents(g.id).length ? `<div class="tbl-wrap"><table><tr><th>O'quvchi</th><th>Login</th><th>Holat</th><th>Ball</th><th>Streak</th><th></th></tr>${groupStudents(g.id).map(s => { const x = stStatus(s.profile_id, g.id); const sc = D.score[s.profile_id] || {}; return `<tr><td><b>${esc(D.P[s.profile_id]?.full_name)}</b></td><td class="muted">${esc(D.P[s.profile_id]?.login)}</td><td><span class="pill p-${x[0]}">${esc(x[1])}</span></td><td class="num">${sc.score ?? '—'}</td><td class="num">${sc.streak ?? 0}</td><td><button class="btn sm o" data-act="parents" data-id="${s.profile_id}">👪 Ota-ona</button></td></tr>`; }).join('')}</table></div>` : `<div class="empty">Guruhda o'quvchi yo'q</div>`}</div>`).join('') || `<div class="muted">Guruh yo'q — «+ Guruh» tugmasini bosing.</div>`}</section>`).join('') : `<div class="empty">${head ? "Hali sinf yo'q." : 'Sizga hali sinf biriktirilmagan. Head teacherga murojaat qiling.'}</div>`}`;
}
function homeworkView() {
  const gids = new Set(myGroups().map(g => g.id));
  const hws = D.assignments.filter(a => gids.has(a.target_group_id));
  return `<div class="between"><h1 style="font-size:28px">Uy vazifalar</h1><button class="btn p" data-act="newHw">+ Uy vazifa berish</button></div>
  ${hws.length ? hws.map(h => { const st = groupStudents(h.target_group_id); const n = st.filter(s => D.subs.some(x => x.assignment_id === h.id && x.student_id === s.profile_id)).length; const g = D.groups.find(x => x.id === h.target_group_id);
    const miss = st.filter(s => !D.subs.some(x => x.assignment_id === h.id && x.student_id === s.profile_id)).map(s => D.P[s.profile_id]?.full_name).filter(Boolean);
    return `<div class="card stack"><div class="between"><b>${esc(h.title)}</b><span class="pill p-info">${esc(g?.name)}</span></div><div class="muted" style="font-size:14px;white-space:pre-wrap">${esc(h.instructions)}</div><div class="between"><span class="muted" style="font-size:13px">Muddat: ${fmt(h.due_at)}</span><span class="num" style="font-size:13px"><b>${n}/${st.length}</b> topshirdi</span></div><div class="bar"><i style="width:${st.length ? n / st.length * 100 : 0}%"></i></div>${miss.length ? `<div style="font-size:13px"><span class="muted">Topshirmaganlar:</span> ${miss.map(esc).join(', ')}</div>` : ''}</div>`; }).join('') : `<div class="empty">Hali vazifa berilmagan.</div>`}`;
}
function checkView() {
  const list = pending();
  return `<h1 style="font-size:28px">Tekshirish</h1><p class="muted" style="margin:0">Baho va izoh qo'ying. Tasdiqlanmaguncha o'quvchi natijani ko'rmaydi.</p>
  ${list.length ? list.map(s => { const a = D.assignments.find(x => x.id === s.assignment_id); const g0 = s.submission_grades; const g = (Array.isArray(g0) ? g0[0] : g0) || {};
    return `<div class="card stack"><div class="between"><b>${esc(D.P[s.student_id]?.full_name)} · ${esc(a?.title)}</b><span class="row" style="gap:6px">${g.ai_score != null ? `<span class="pill p-info">🤖 AI: ${g.ai_score}</span>` : ''}${s.is_late ? '<span class="pill p-warn">Kechikkan</span>' : ''}</span></div>
    ${g.ai_feedback ? `<div class="ask" style="font-size:14px"><b style="color:var(--primary)">🤖 AI taklifi</b><div>${esc(g.ai_feedback)}</div><span class="muted" style="font-size:12px">Ball va izoh pastga qo'yildi — o'zgartirib tasdiqlashingiz mumkin.</span></div>` : `<button class="btn sm s" style="justify-self:start" data-act="aiRun" data-id="${s.id}">🤖 AI bilan tekshirish</button>`}
    <div style="white-space:pre-wrap;background:var(--bg);border-radius:12px;padding:12px">${esc(s.text_answer)}</div>
    <div class="row"><div class="field" style="width:120px"><label for="sc_${s.id}">Ball (0–100)</label><input id="sc_${s.id}" type="number" min="0" max="100" value="${g.ai_score ?? ''}"></div>
     <div class="field" style="flex:1;min-width:220px"><label for="fb_${s.id}">Izoh (keyingi qadam)</label><input id="fb_${s.id}" value="${esc(g.ai_feedback || '')}" placeholder="Masalan: Check Past Simple -ed endings."></div></div>
    <div class="row"><button class="btn sm p" data-act="approve" data-id="${s.id}">Tasdiqlash</button><button class="btn sm t" data-act="return" data-id="${s.id}">Qayta ishlashga qaytarish</button></div></div>`; }).join('') : `<div class="empty">Tekshiriladigan ish yo'q.</div>`}
  ${checkedHistory()}`;
}
function checkedHistory() {
  const gids = new Set(myGroups().map(g => g.id));
  const done = D.subs.filter(s => (s.status === 'approved' || s.status === 'returned') && D.assignments.some(a => a.id === s.assignment_id && gids.has(a.target_group_id))).slice(0, 20);
  if (!done.length) return '';
  return `<h2 style="font-size:18px">Tekshirilganlar (oxirgi ${done.length} ta)</h2>${done.map(s => { const a = D.assignments.find(x => x.id === s.assignment_id); const g0 = s.submission_grades; const g = (Array.isArray(g0) ? g0[0] : g0) || {};
    return `<details class="card"><summary class="between" style="cursor:pointer;list-style:none"><b>${esc(D.P[s.student_id]?.full_name)} · ${esc(a?.title)}</b><span>${s.status === 'approved' ? `<span class="pill p-ok">${g.final_score ?? '—'} ball</span>` : '<span class="pill p-bad">Qaytarilgan</span>'}</span></summary>
    <div class="stack" style="margin-top:10px"><div style="white-space:pre-wrap;background:var(--bg);border-radius:12px;padding:12px">${esc(s.text_answer)}</div>${g.final_feedback ? `<div class="muted" style="font-size:14px">Izoh: "${esc(g.final_feedback)}"</div>` : ''}${g.approved_at ? `<div class="muted" style="font-size:12px">${fmt(g.approved_at)}</div>` : ''}</div></details>`; }).join('')}`;
}
function ratingView() {
  return `<h1 style="font-size:28px">Reyting</h1><p class="muted" style="margin:0">Haftalik ball: vazifa bajarilishi 30%, sifati 30%, Daily Challenge 20%, faollik 20% + streak bonusi (maks. 100).</p>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">${myClasses().map(c => { const r = Object.values(D.score).filter(x => x.class_id === c.id).sort((a, b) => b.score - a.score); const avg = r.length ? Math.round(r.reduce((a, x) => a + Number(x.score), 0) / r.length) : 0;
    return `<section class="card stack"><div class="between"><h2 style="font-size:18px">${esc(c.name)}</h2><span class="muted" style="font-size:13px">o'rtacha <b class="num" style="color:var(--text)">${avg}</b></span></div><div class="lb">${r.slice(0, 3).map((x, i) => `<div class="lb-row"><span class="medal" style="background:${medal(i)}">${i + 1}</span><span class="n">${esc(x.full_name)}</span><b class="num">${x.score}</b></div>`).join('') || `<div class="empty">O'quvchi yo'q</div>`}</div></section>`; }).join('') || `<div class="empty">Sinf yo'q</div>`}</div>
  ${weeklyHistory()}`;
}

/* student */
function studentView() {
  if (!view || !['home','lessons','tasks','results','rating'].includes(view)) view = 'home';
  const g = D.group; const k = D.streak && D.streak.last_completed_date >= new Date(Date.now() - 864e5).toLocaleDateString('en-CA', {timeZone:'Asia/Tashkent'}) ? D.streak.current_streak : 0;
  const subOf = id => D.subs.find(s => s.assignment_id === id);
  const open = D.assignments.filter(a => { const s = subOf(a.id); return !s || s.status === 'returned'; });
  const waiting = D.assignments.filter(a => { const s = subOf(a.id); return s && s.status !== 'approved' && s.status !== 'returned'; });
  const topic = TOPICS[(g?.current_topic || 0) % TOPICS.length];
  let body = '';
  if (view === 'home') {
    const last = D.grades.filter(x => x.status === 'approved').sort((a, b) => String(b.approved_at).localeCompare(String(a.approved_at)))[0];
    body = `<div class="between"><div><div class="muted" style="font-size:13px">Xayrli kun</div><h1 style="font-size:24px">Salom, ${esc(me.full_name.split(' ')[0])}!</h1></div><span class="streak num">🔥 ${k} kun</span></div>
    <div class="card stack"><div class="between" style="font-size:13px"><b>${esc(g?.name || '')}</b><span class="muted">Mavzu ${((g?.current_topic || 0) % TOPICS.length) + 1}/${TOPICS.length}</span></div><div class="bar"><i style="width:${(((g?.current_topic || 0) % TOPICS.length) + 1) / TOPICS.length * 100}%"></i></div><div class="muted" style="font-size:13px">${topic.unit ? esc(topic.unit) + ' · ' : ''}${esc(topic.t)}</div></div>
    ${(() => { const nx = (D.sessions || []).find(s => sessionEnd(s) >= Date.now()); return nx ? liveCard(nx, false, 'KEYINGI JONLI DARS') : ''; })()}
    ${(D.ann || []).slice(0, 2).map(annCard).join('')}
    ${watchCard()}
    <div class="hero-card"><div style="font-size:12px;font-weight:600;letter-spacing:.06em;opacity:.8">DAILY CHALLENGE · 1 DAQIQA</div><div style="font-size:17px;font-weight:700">${D.todayCh ? 'Bugungi challenge bajarildi ✓ (' + D.todayCh.score + '/3)' : '3 ta savol — streakni saqlang'}</div>${D.todayCh ? '' : '<button class="btn" style="background:#fff;color:#1746A2" data-act="challenge">Boshlash</button>'}</div>
    <div class="card stack"><div class="between"><b>Vazifalar</b><span class="muted">${open.length} ta</span></div>${open.slice(0, 3).map(a => `<div class="between"><div><div style="font-weight:600">${esc(a.title)}</div><div style="font-size:12px;font-weight:600;color:${a.due_at && new Date(a.due_at) < new Date() ? 'var(--bad)' : 'var(--warn)'}">${fmt(a.due_at)} gacha</div></div><button class="btn sm s" data-act="submit" data-id="${a.id}">Topshirish</button></div>`).join('') || (waiting.length ? '' : '<div class="muted">Hamma vazifa topshirilgan 🎉</div>')}
    ${waiting.map(a => `<div class="between"><div style="font-weight:600">${esc(a.title)}</div><span class="pill p-info">Tekshirilmoqda</span></div>`).join('')}</div>
    ${last ? `<div class="card row"><div class="num" style="font-size:28px;font-weight:700;color:var(--ok)">${last.final_score}</div><div style="min-width:0"><div style="font-size:13px;font-weight:600">Oxirgi natija · ${esc(D.assignments.find(a => a.id === last.assignment_id)?.title)}</div><div class="muted" style="font-size:13px">"${esc(last.final_feedback)}"</div></div></div>` : ''}`;
  } else if (view === 'tasks') {
    body = `<h1 style="font-size:24px">Vazifalar</h1>${D.assignments.map(a => { const s = subOf(a.id); const st = !s ? ['warn', 'Topshirilmagan'] : s.status === 'approved' ? ['ok', 'Baholandi'] : s.status === 'returned' ? ['bad', 'Qayta ishlash kerak'] : ['info', 'Tekshirilmoqda'];
      return `<div class="card stack"><div class="between"><b>${esc(a.title)}</b><span class="pill p-${st[0]}">${st[1]}</span></div><div class="muted" style="font-size:14px;white-space:pre-wrap">${esc(a.instructions)}</div><div class="between"><span class="muted" style="font-size:13px">${fmt(a.due_at)}</span>${!s || s.status === 'returned' ? `<button class="btn sm p" data-act="submit" data-id="${a.id}">Topshirish</button>` : ''}</div></div>`; }).join('') || `<div class="empty">Hali vazifa yo'q.</div>`}`;
  } else if (view === 'results') {
    const res = D.grades.filter(x => x.status === 'approved');
    const mine = D.board.find(x => x.student_id === me.id);
    body = `<h1 style="font-size:24px">Natijalar</h1><div class="kpis">${kpi('Haftalik ball', mine ? mine.score : '—')}${kpi('Streak', k)}</div>${rewardsCard()}
    ${res.map(x => `<div class="card stack"><div class="between"><b>${esc(D.assignments.find(a => a.id === x.assignment_id)?.title)}</b><b class="num" style="color:var(--ok)">${x.final_score}/100</b></div><div class="muted">"${esc(x.final_feedback)}"</div></div>`).join('') || `<div class="empty">Baholangan ish hali yo'q.</div>`}`;
  } else if (view === 'lessons') {
    const cur = (g?.current_topic || 0) % TOPICS.length;
    const opened = new Set(TOPICS.slice(0, cur + 1).map(x => x.id).filter(Boolean));
    const ls = D.lessons.filter(l => !l.is_template || !TOPICS[0].id || opened.has(l.id)).sort((a, b) => (opened.has(b.id) ? TOPICS.findIndex(x => x.id === b.id) : 999) - (opened.has(a.id) ? TOPICS.findIndex(x => x.id === a.id) : 999));
    body = `<h1 style="font-size:24px">Darslar</h1><p class="muted" style="margin:0;font-size:13px">O'tilgan va hozirgi mavzu darslari. Yangi mavzu ochilganda bu yerda paydo bo'ladi.</p>${ls.map(l => lessonCard(l)).join('') || `<div class="empty">O'qituvchingiz hali dars qo'shmagan.</div>`}`;
  } else body = boardHtml(D.board, me.id, 'Reyting · ' + (g?.name || ''));
  return phoneShell(body, [['home','Bosh',ICON.home],['lessons','Darslar',ICON.book],['tasks','Vazifa',ICON.task],['results','Natija',ICON.cup],['rating','Reyting',ICON.star]]);
}
function boardHtml(board, selfId, title) {
  const top = board.filter(x => x.rnk <= 3); const mine = board.find(x => x.student_id === selfId);
  return `<h1 style="font-size:22px">${esc(title)}</h1><div class="lb">${top.map((x, i) => `<div class="lb-row ${x.student_id === selfId ? 'me' : ''}"><span class="medal" style="background:${medal(i)}">${x.rnk}</span><span class="n">${esc(x.full_name)}</span><b class="num">${x.score}</b></div>`).join('') || `<div class="empty">Reyting hali shakllanmagan</div>`}
  ${mine && mine.rnk > 3 ? `<div class="lb-row me"><span class="medal" style="background:var(--card)">${mine.rnk}</span><span class="n">${selfId === me.id ? 'Siz' : esc(mine.full_name)}</span><b class="num">${mine.score}</b></div>` : ''}</div>
  <p class="muted" style="font-size:13px">Har kuni Daily Challenge va vaqtida topshirilgan vazifa ballni oshiradi.</p>`;
}
/* parent */
function parentView() {
  if (!view || !['home','stats'].includes(view)) view = 'home';
  if (!D.kids || !D.kids.length) return phoneShell(`<div class="empty">Sizga hali farzand biriktirilmagan. O'qituvchiga murojaat qiling.</div>`, []);
  const kid = D.kid; const tp = TOPICS[(D.group?.current_topic || 0) % TOPICS.length];
  const last = D.assignments[0]; const ls = last && D.subs.find(s => s.assignment_id === last.id); const lg = last && D.grades.find(x => x.assignment_id === last.id && x.status === 'approved');
  const mine = D.board.find(x => x.student_id === kid.profile_id);
  let body = `<div class="between"><div><div class="muted" style="font-size:13px">Farzandingiz</div><h1 style="font-size:22px">${esc(kid.name)}</h1><div class="muted" style="font-size:13px">${esc(D.group?.name || '')}</div></div>${D.kids.length > 1 ? `<select id="kidSel" aria-label="Farzandni tanlash" style="width:auto">${D.kids.map(k => `<option value="${k.profile_id}" ${k.profile_id === kid.profile_id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select>` : ''}</div>`;
  if (view === 'home') {
    const nx = (D.sessions || []).find(s => sessionEnd(s) >= Date.now());
    body += `${nx ? liveCard(nx, false, 'KEYINGI JONLI DARS') : ''}${(D.ann || []).slice(0, 2).map(annCard).join('')}<div class="card stack"><div class="muted" style="font-size:12px;font-weight:600;letter-spacing:.06em">HOZIRGI MAVZU${tp.unit ? ' · ' + esc(tp.unit) : ''}</div><b style="font-size:16px">${esc(tp.t)}</b></div>
    <div class="ask"><b style="color:var(--primary)">Farzandingizdan so'rang</b>${tp.ask.map((x, i) => `<div><b>${i + 1}.</b> ${esc(x[0])} <span class="muted">— ${esc(x[1])}</span></div>`).join('')}</div>
    <div class="card stack"><div class="between"><span>${last ? esc(last.title) : "Vazifa yo'q"}</span>${last ? (lg ? `<span class="pill p-ok">Baholandi · ${lg.final_score}</span>` : ls ? '<span class="pill p-info">Topshirildi</span>' : '<span class="pill p-warn">Topshirilmagan</span>') : ''}</div>${lg ? `<div class="muted" style="font-size:14px">O'qituvchi: "${esc(lg.final_feedback)}"</div>` : ''}</div>`;
  } else {
    const k = D.streak ? D.streak.current_streak : 0;
    const pastS = (D.sessions || []).filter(s => sessionEnd(s) < Date.now()).map(s => s.id);
    const came = (D.att || []).filter(a => pastS.includes(a.session_id) && a.status !== 'absent').length;
    body += `<div class="kpis">${kpi('Haftalik ball', mine ? mine.score : '—')}${kpi('Streak', k)}${pastS.length ? kpi('Davomat', came + '/' + pastS.length) : ''}</div>
    <div class="card stack"><div class="between"><span>Guruhda o'rni</span><b class="num">${mine ? mine.rnk + "-o'rin" : '—'}</b></div></div>
    <div class="card stack"><b>🏅 Nishonlar</b>${badgeChips(D.sbadges || [])}</div>${boardHtml(D.board, kid.profile_id, 'Guruh top-3')}`;
  }
  return phoneShell(body, [['home','Bugun',ICON.home],['stats','Statistika',ICON.cup]]);
}
function phoneShell(body, tabs) {
  return `<div class="phone">${body}<div class="row" style="justify-content:center"><button class="btn o sm" data-act="fbOpen">💬 Fikr bildirish</button><button class="btn o sm" data-act="pwOpen">🔑 Parolni almashtirish</button><button class="btn o sm" data-act="tgLink">📲 Telegram'ga ulash</button></div></div><nav class="bottom"><div class="in" style="grid-template-columns:repeat(${tabs.length + 1},1fr)">${tabs.map(([k, l, i]) => `<button class="${view === k ? 'on' : ''}" data-nav="${k}">${i}${l}</button>`).join('')}<button data-act="logout">${ICON.out}Chiqish</button></div></nav>`;
}

/* ---------------- modals ---------------- */
function modal(html) { $('#modal').innerHTML = `<div class="modal" data-act="closeBg"><div class="box" role="dialog" aria-modal="true">${html}</div></div>`; const f = $('#modal input,#modal textarea,#modal select'); if (f) f.focus(); }
function closeModal() { $('#modal').innerHTML = ''; clearInterval(chal.timer); }
const credsBox = (u, who) => `<div class="ask">${who ? `<b>${who}</b>` : ''}<div>Login: <b>${esc(u.login)}</b></div><div>Parol: <b>${esc(u.password)}</b></div><span class="muted" style="font-size:13px">Saqlab qo'ying — parol boshqa ko'rsatilmaydi.</span></div>`;
const formBtns = l => `<div class="row"><button class="btn p" type="submit">${l}</button><button class="btn o" type="button" data-act="close">Bekor qilish</button></div>`;

const chal = {q: [], i: 0, score: 0, left: 60, timer: null};
function startChallenge() {
  Object.assign(chal, {q: pickChallenge(((D.group?.current_topic) || 0) % TOPICS.length), i: 0, score: 0, left: 60, answers: []});
  clearInterval(chal.timer);
  chal.timer = setInterval(() => { chal.left--; const t = $('#chT'); if (t) t.textContent = chal.left + ' s'; if (chal.left <= 0) finishChallenge(); }, 1000);
  drawChallenge();
}
function drawChallenge() {
  const x = chal.q[chal.i];
  modal(`<div class="between"><b>Daily Challenge · ${chal.i + 1}/3</b><span class="pill p-warn num" id="chT">${chal.left} s</span></div>${x.review ? '<span class="pill p-info" style="justify-self:start">Takrorlash · ' + esc(TOPICS[x.t].t) + '</span>' : ''}<div style="font-size:17px;font-weight:600">${esc(x.q)}</div><div class="stack">${x.o.map((o, i) => `<button class="q-opt" data-act="ans" data-i="${i}">${esc(o)}</button>`).join('')}</div>`);
}
async function finishChallenge() {
  clearInterval(chal.timer); if (chal.done) return; chal.done = true;
  try {
    await q(sb.from('daily_challenges').insert({student_id: me.id, challenge_date: todayISO(), questions: chal.q, answers: chal.answers, score: chal.score, completed_at: new Date().toISOString()}));
  } catch (e) { toast('Saqlanmadi: ' + e.message); }
  const review = chal.q.map((x, i) => { const ans = chal.answers[i]; const ok = ans === x.a;
    return `<div style="text-align:left;border-top:1px solid var(--border);padding-top:8px"><div style="font-size:14px">${ok ? '✅' : '❌'} ${esc(x.q)}</div>${ok ? '' : `<div class="muted" style="font-size:13px">${ans === undefined ? 'Javob berilmadi' : 'Sizning javobingiz: ' + esc(x.o[ans])} · To'g'ri javob: <b style="color:var(--ok)">${esc(x.o[x.a])}</b></div>`}</div>`; }).join('');
  modal(`<div style="text-align:center;display:grid;gap:10px"><div style="font-size:40px">🔥</div><h2>${chal.score}/3 — ${chal.score === 3 ? 'Great job!' : chal.score ? 'Good try!' : 'Keep going!'}</h2>${review}<button class="btn p" data-act="closeReload">Davom etish</button></div>`);
}

/* ---------------- events ---------------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act],[data-nav]'); if (!b) return;
  if (b.dataset.nav) { view = b.dataset.nav; render(); window.scrollTo(0, 0); return; }
  const a = b.dataset.act, id = b.dataset.id;
  if (a === 'closeBg') { if (e.target === b) closeModal(); return; }
  if (a === 'close') return closeModal();
  if (a === 'closeReload') { closeModal(); return load(); }
  if (a === 'reload') return load();
  if (a === 'logout') { await sb.auth.signOut(); me = null; view = null; D = {}; return render(); }
  if (a === 'newTeacher') return modal(`<h2>O'qituvchi qo'shish</h2><form id="tForm" class="stack"><div class="field"><label for="tN">Ism familiya</label><input id="tN" required></div><div class="field"><label for="tL">Login (ixtiyoriy)</label><input id="tL" autocapitalize="none" placeholder="masalan: aziz"></div>${formBtns("Qo'shish")}</form>`);
  if (a === 'newClass') return modal(`<h2>Sinf yaratish</h2><form id="cForm" class="stack"><div class="field"><label for="cN">Sinf nomi</label><input id="cN" placeholder="5-A" required></div><div class="field"><label for="cT">O'qituvchi</label><select id="cT"><option value="">—</option>${Object.values(D.P).filter(p => p.role === 'teacher' || p.role === 'head_teacher').map(t => `<option value="${t.id}">${esc(t.full_name)}</option>`).join('')}</select></div>${formBtns('Yaratish')}</form>`);
  if (a === 'assignTeacher') { const cur = D.ct.filter(x => x.class_id === id).map(x => x.teacher_id); return modal(`<h2>O'qituvchilar · ${esc(D.classes.find(c => c.id === id).name)}</h2><form id="atForm" data-id="${id}" class="stack"><p class="muted" style="margin:0">Bitta sinfga 2 tagacha o'qituvchi.</p>${Object.values(D.P).filter(p => p.role === 'teacher' || p.role === 'head_teacher').map(t => `<label class="row"><input type="checkbox" value="${t.id}" style="width:20px;height:20px" ${cur.includes(t.id) ? 'checked' : ''}> ${esc(t.full_name)}</label>`).join('')}${formBtns('Saqlash')}</form>`); }
  if (a === 'newGroup') { const c = D.classes.find(x => x.id === id); return modal(`<h2>Guruh yaratish · ${esc(c.name)}</h2><form id="gForm" data-id="${id}" class="stack"><div class="field"><label for="gN">Guruh nomi</label><input id="gN" value="${esc(c.name)} · ${classGroups(id).length + 1}-guruh" required></div>${formBtns('Yaratish')}</form>`); }
  if (a === 'newStudent') return modal(`<h2>O'quvchi qo'shish · ${esc(D.groups.find(g => g.id === id).name)}</h2><form id="sForm" data-id="${id}" class="stack"><div class="field"><label for="sN">Ism familiya (lotin)</label><input id="sN" required></div><div class="field"><label for="sL">Login (ixtiyoriy)</label><input id="sL" autocapitalize="none"></div>
    <fieldset class="stack" style="border:1px solid var(--border);border-radius:12px;padding:12px;gap:8px"><legend style="font-weight:600;padding:0 6px">Ota-ona</legend>
      <label class="row" style="gap:8px;flex-wrap:nowrap"><input type="radio" name="pm" value="new" checked style="width:18px;height:18px"> Yangi ota-ona logini yaratish</label>
      <div class="field" data-pm="new"><input id="sPN" placeholder="Ota-ona ismi (ixtiyoriy), masalan: Karimova Dilnoza"></div>
      <label class="row" style="gap:8px;flex-wrap:nowrap"><input type="radio" name="pm" value="old" style="width:18px;height:18px"> Mavjud ota-onaga biriktirish (aka-uka, opa-singil bo'lsa)</label>
      <div class="field" data-pm="old" style="display:none"><input id="sPL" autocapitalize="none" placeholder="Ota-ona logini, masalan: ota.ali"></div>
      <label class="row" style="gap:8px;flex-wrap:nowrap"><input type="radio" name="pm" value="none" style="width:18px;height:18px"> Hozircha kerak emas</label>
    </fieldset>${formBtns("Qo'shish")}</form>`);
  if (a === 'parents') { const s = D.students.find(x => x.profile_id === id); const nm = D.P[id]?.full_name || '';
    modal(`<div class="between"><h2>👪 ${esc(nm)} — ota-onalari</h2><button class="btn sm o" data-act="close">Yopish</button></div><div id="parList" class="stack"><div class="muted">Yuklanmoqda…</div></div>
    <form id="parLink" data-id="${id}" class="stack" style="border-top:1px solid var(--border);padding-top:12px"><b>Mavjud ota-onani biriktirish</b><p class="muted" style="margin:0;font-size:13px">Aka-uka yoki opa-singillar uchun: birinchi farzandning ota-ona logini (masalan <b>ota.ali</b>) — shunda ota-ona bitta login bilan barcha farzandlarini ko'radi.</p><div class="row"><input id="plL" autocapitalize="none" placeholder="ota.ali" style="flex:1;min-width:160px" required><button class="btn p" type="submit">Biriktirish</button></div></form>
    <form id="parNew" data-id="${id}" class="stack" style="border-top:1px solid var(--border);padding-top:12px"><b>Yangi ota-ona logini yaratish</b><div class="row"><input id="pnN" placeholder="Ota-ona ismi (ixtiyoriy)" style="flex:1;min-width:160px"><button class="btn s" type="submit">Yaratish</button></div></form>`);
    loadParents(id); return; }
  if (a === 'unlinkPar') { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Rostdanmi?'; return; }
    try { await q(sb.rpc('unlink_parent', {p_parent: id, p_student: b.dataset.st})); toast('Ajratildi'); loadParents(b.dataset.st); } catch (err) { toast(err.message); } return; }
  if (a === 'newHw') { const gs = myGroups(); if (!gs.length) return toast('Avval guruh yarating'); const dv = new Date(Date.now() + 864e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    return modal(`<h2>Uy vazifa berish</h2><form id="hwForm" class="stack"><div class="field"><label for="hwG">Guruh</label><select id="hwG">${gs.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div><div class="field"><label for="hwT">Nomi</label><input id="hwT" placeholder="Writing: My family" required></div><div class="field"><label for="hwI">Shart (inglizcha)</label><textarea id="hwI" placeholder="Write 5 sentences about your family. Use am / is / are."></textarea></div><div class="field"><label for="hwD">Muddat</label><input id="hwD" type="datetime-local" value="${dv}"></div>${formBtns('Berish')}</form>`); }
  if (a === 'nextTopic') { const g = D.groups.find(x => x.id === id); try { await q(sb.from('groups').update({current_topic: (g.current_topic + 1) % TOPICS.length}).eq('id', id)); toast('Mavzu yangilandi'); load(); } catch (err) { toast(err.message); } return; }
  if (a === 'approve' || a === 'return') {
    const sc = $('#sc_' + id).value, fb = $('#fb_' + id).value.trim();
    if (a === 'approve' && (sc === '' || +sc < 0 || +sc > 100)) return toast('0 dan 100 gacha ball kiriting');
    if (a === 'approve' && !fb) return toast("Izoh yozing — o'quvchi keyingi qadamni bilsin");
    b.disabled = true;
    try {
      await q(sb.from('submission_grades').upsert({submission_id: id, final_score: a === 'approve' ? Math.round(+sc) : null, final_feedback: fb || 'Please correct the mistakes and send again.', graded_by: me.id, approved_at: a === 'approve' ? new Date().toISOString() : null}));
      await q(sb.from('submissions').update({status: a === 'approve' ? 'approved' : 'returned'}).eq('id', id));
      toast(a === 'approve' ? 'Tasdiqlandi' : 'Qaytarildi'); load();
    } catch (err) { b.disabled = false; toast(err.message); }
    return;
  }
  if (a === 'submit') { const as = D.assignments.find(x => x.id === id); const s = D.subs.find(x => x.assignment_id === id);
    return modal(`<h2>${esc(as.title)}</h2><p class="muted" style="margin:0;white-space:pre-wrap">${esc(as.instructions)}</p><form id="subForm" data-id="${id}" class="stack"><div class="field"><label for="subT">Javobingiz</label><textarea id="subT" required>${esc(s?.text_answer || '')}</textarea></div>${formBtns('Yuborish')}</form>`); }
  if (a === 'challenge') { chal.done = false; return startChallenge(); }
  if (a === 'openLesson') return openLesson(id);
  if (a === 'copyLesson') { b.disabled = true; try { await q(sb.rpc('copy_lesson', {p_lesson_id: id})); toast("Nusxa olindi — dars o'quvchilaringizga ochildi"); load(); } catch (err) { b.disabled = false; toast(err.message); } return; }
  if (a === 'delLesson') { if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Rostdan o\'chirilsinmi?'; return; } try { await q(sb.from('lessons').delete().eq('id', id)); toast("O'chirildi"); load(); } catch (err) { toast(err.message); } return; }
  if (a === 'newLesson') return modal(`<h2>Dars yaratish</h2><form id="lsForm" class="stack"><div class="field"><label for="lsT">Mavzu</label><input id="lsT" required placeholder="Present Simple — Daily Routines"></div><div class="field"><label for="lsO">Maqsad</label><input id="lsO" placeholder="Students can talk about their daily routine."></div>
    ${Object.entries(SEC_UZ).map(([k, v]) => `<div class="field"><label for="ls_${k}">${v} (ixtiyoriy)</label><textarea id="ls_${k}" style="min-height:70px"></textarea></div>`).join('')}
    <div class="field"><label for="lsV">Video yoki material havolasi (ixtiyoriy)</label><input id="lsV" type="url" placeholder="https://youtube.com/..."></div>
    ${me.role === 'head_teacher' ? '<label class="row"><input id="lsTpl" type="checkbox" checked style="width:20px;height:20px"> Namuna dars (hamma o\'qituvchiga ochiq)</label>' : ''}${formBtns('Saqlash')}</form>`);
  if (a === 'fbOpen') return modal(`<h2>Fikr bildirish</h2><p class="muted" style="margin:0">Nima yoqdi, nima yoqmadi, nimani o'zgartirish kerak? Taklifingiz to'g'ridan-to'g'ri ishlab chiquvchiga boradi.</p><form id="fbForm" class="stack"><div class="field"><label for="fbT">Fikringiz</label><textarea id="fbT" required></textarea></div>${formBtns('Yuborish')}</form>`);
  if (a === 'newAnn') { const head = me.role === 'head_teacher';
    const opts = [...(head ? [['school', 'Butun maktab'], ['teachers', "O'qituvchilar"], ['parents', 'Barcha ota-onalar']] : []),
      ...myClasses().map(c => ['class:' + c.id, 'Sinf: ' + c.name]), ...myGroups().map(g => ['group:' + g.id, 'Guruh: ' + g.name])];
    if (!opts.length) return toast('Avval sinf yoki guruh kerak');
    return modal(`<h2>E'lon yozish</h2><form id="annForm" class="stack"><div class="field"><label for="annA">Kimga</label><select id="annA">${opts.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></div><div class="field"><label for="annT">Sarlavha</label><input id="annT" required placeholder="Ertaga test bo'ladi"></div><div class="field"><label for="annB">Matn</label><textarea id="annB" required></textarea></div>${formBtns('Yuborish')}</form>`); }
  if (a === 'newLive') { const gs = myGroups(); if (!gs.length) return toast('Avval guruh yarating');
    const t = new Date(Date.now() + 864e5); t.setHours(15, 0, 0, 0); const dv = new Date(t.getTime() - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    return modal(`<h2>Jonli dars rejalashtirish</h2><form id="liveForm" class="stack"><div class="field"><label for="lvG">Guruh</label><select id="lvG">${gs.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div><div class="field"><label for="lvD">Boshlanish vaqti</label><input id="lvD" type="datetime-local" value="${dv}" required></div><div class="field"><label for="lvM">Davomiyligi (daqiqa)</label><input id="lvM" type="number" min="10" max="240" value="45"></div><div class="field"><label for="lvU">Google Meet havolasi</label><input id="lvU" type="url" placeholder="https://meet.google.com/abc-defg-hij"></div>${formBtns('Saqlash')}</form>`); }
  if (a === 'tgLink') { b.disabled = true;
    try { const code = await q(sb.rpc('telegram_link_code'));
      modal(`<h2>📲 Telegram'ga ulash</h2><p class="muted" style="margin:0">Baholar, eslatmalar, e'lonlar va har yakshanba haftalik hisobot Telegram'ga keladi.</p>
      <div class="ask" style="text-align:center"><div class="muted" style="font-size:13px">Sizning kodingiz (15 daqiqa amal qiladi)</div><div class="num" style="font-size:36px;font-weight:800;letter-spacing:.2em">${esc(code)}</div></div>
      <ol style="margin:0;padding-left:20px"><li>Pastdagi tugma bilan botni oching</li><li>START ni bosing — bot avtomatik ulanadi</li></ol>
      <a class="btn p" href="https://t.me/northstar_smartum_bot?start=${esc(code)}" target="_blank" rel="noopener">Botni ochish</a><button class="btn o" data-act="close">Yopish</button>`);
    } catch (err) { toast(err.message); } finally { b.disabled = false; } return; }
  if (a === 'newWatch') { const cs = myClasses(); if (!cs.length) return toast('Avval sinf kerak');
    return modal(`<h2>Watching Time qo'shish</h2><form id="watchForm" class="stack"><div class="field"><label for="wtC">Sinf</label><select id="wtC">${cs.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label for="wtT">Nomi</label><input id="wtT" required placeholder="Peppa Pig — My family"></div><div class="field"><label for="wtU">YouTube havolasi</label><input id="wtU" required placeholder="https://www.youtube.com/watch?v=..."></div><div class="field"><label for="wtQ">Savollar</label><textarea id="wtQ" style="min-height:180px" placeholder="Who is Peppa's brother?&#10;*George&#10;Danny&#10;Pedro&#10;&#10;Where do they live?&#10;in a flat&#10;*in a house"></textarea><span class="muted" style="font-size:12px">Har savol: 1-qator savol, keyin variantlar; to'g'ri javob oldiga * qo'ying. Savollar orasida bo'sh qator.</span></div>${formBtns('Saqlash')}</form>`); }
  if (a === 'watchOpen') { const w = D.wt.find(x => x.id === id); if (!w) return;
    return modal(`<div class="between"><h2 style="font-size:18px">🎬 ${esc(w.title)}</h2><button class="btn sm o" type="button" data-act="close">Yopish</button></div><div style="position:relative;padding-top:56.25%;border-radius:12px;overflow:hidden;background:#000"><iframe src="${esc(w.youtube_embed_url)}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen title="${esc(w.title)}"></iframe></div>
    <form id="watchAns" data-id="${w.id}" class="stack">${(w.questions || []).map((x, i) => `<fieldset style="border:1px solid var(--border);border-radius:12px;padding:10px"><legend style="font-weight:600;padding:0 6px">${i + 1}. ${esc(x.q)}</legend>${x.o.map((o, j) => `<label class="row" style="gap:8px;padding:4px 0"><input type="radio" name="wq${i}" value="${j}" style="width:18px;height:18px" required> ${esc(o)}</label>`).join('')}</fieldset>`).join('')}${formBtns('Javoblarni yuborish')}</form>`); }
  if (a === 'boxOpen') { b.disabled = true; try { const r = await q(sb.rpc('open_mystery_box')); modal(`<div style="text-align:center;display:grid;gap:10px"><div style="font-size:48px">🎁</div><h2>${esc(r.title)}</h2><p class="muted" style="margin:0">${esc(r.description || '')}</p><p style="margin:0;font-size:13px">O'qituvchingiz sovg'ani beradi.</p><button class="btn p" data-act="closeReload">Zo'r!</button></div>`); } catch (err) { b.disabled = false; toast(err.message); } return; }
  if (a === 'boxClaim') { b.disabled = true; try { await q(sb.from('mystery_box_openings').update({is_claimed: true}).eq('id', id)); load(); } catch (err) { b.disabled = false; toast(err.message); } return; }
  if (a === 'saveWeek') { b.disabled = true; try { const n = await q(sb.rpc('save_week_now')); toast(n + ' ta o\'quvchi natijasi saqlandi'); load(); } catch (err) { b.disabled = false; toast(err.message); } return; }
  if (a === 'aiRun') { b.disabled = true; b.textContent = '🤖 Tekshirilmoqda…'; const r = await aiCheck(id); if (r) { toast('AI tekshirdi: ' + r.ai_score + ' ball'); load(); } else { b.disabled = false; b.textContent = '🤖 AI bilan tekshirish'; } return; }
  if (a === 'att') { b.disabled = true;
    try { await q(sb.from('attendance').upsert({session_id: id, student_id: b.dataset.st, status: b.dataset.k, marked_by: me.id, marked_at: new Date().toISOString()}, {onConflict: 'session_id,student_id'})); load(); } catch (err) { b.disabled = false; toast(err.message); } return; }
  if (a === 'pwOpen') return modal(`<h2>Parolni almashtirish</h2><form id="pwForm" class="stack"><div class="field"><label for="pw1">Yangi parol (kamida 6 belgi)</label><input id="pw1" type="password" autocomplete="new-password" minlength="6" required></div><div class="field"><label for="pw2">Yangi parolni takrorlang</label><input id="pw2" type="password" autocomplete="new-password" minlength="6" required></div>${formBtns('Saqlash')}</form>`);
  if (a === 'fbDone') { try { await q(sb.from('feedback').update({status: 'done'}).eq('id', id)); load(); } catch (err) { toast(err.message); } return; }
  if (a === 'ans') { const x = chal.q[chal.i], i = +b.dataset.i; chal.answers.push(i);
    document.querySelectorAll('.q-opt').forEach((o, j) => { o.disabled = true; if (j === x.a) o.classList.add('ok'); else if (j === i) o.classList.add('no'); });
    if (i === x.a) chal.score++;
    setTimeout(() => { chal.i++; if (chal.i >= 3) finishChallenge(); else drawChallenge(); }, 700); return; }
});
document.addEventListener('change', e => {
  if (e.target.id === 'kidSel') { D.active = e.target.value; load(); }
  if (e.target.name === 'pm') document.querySelectorAll('[data-pm]').forEach(x => { x.style.display = x.dataset.pm === e.target.value ? '' : 'none'; });
});
async function loadParents(sid) {
  const box = $('#parList'); if (!box) return;
  try { const rows = await q(sb.rpc('student_parents', {p_student: sid}));
    box.innerHTML = rows.length ? rows.map(r => `<div class="between"><div><b>${esc(r.full_name)}</b> <span class="muted">· ${esc(r.login)}</span><div class="muted" style="font-size:12px">Farzandlari: ${esc(r.children || '')}</div></div><button class="btn sm t" data-act="unlinkPar" data-id="${r.parent_id}" data-st="${sid}">Ajratish</button></div>`).join('') : `<div class="empty">Ota-ona biriktirilmagan</div>`;
  } catch (e) { box.innerHTML = `<div class="muted">${esc(e.message)}</div>`; }
}
document.addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target; if (busy) return; busy = true;
  const btn = f.querySelector('[type=submit]'); if (btn) btn.disabled = true;
  try {
    if (f.id === 'loginForm') {
      const l = $('#lg').value.trim().toLowerCase(), p = $('#pw').value;
      const { error } = await sb.auth.signInWithPassword({email: l + '@northstar.local', password: p});
      if (error) { $('#lerr').textContent = "Login yoki parol noto'g'ri. Qaytadan kiriting."; return; }
      view = null; await boot(); return;
    }
    if (f.id === 'tForm') { const u = await fn({role: 'teacher', full_name: $('#tN').value.trim(), login: $('#tL').value.trim()}); modal(`<h2>O'qituvchi qo'shildi</h2>${credsBox(u)}<button class="btn p" data-act="closeReload">Tayyor</button>`); return; }
    if (f.id === 'cForm') { const c = await q(sb.from('classes').insert({name: $('#cN').value.trim(), created_by: me.id, level_id: null}).select().single()); if ($('#cT').value) await q(sb.from('class_teachers').insert({class_id: c.id, teacher_id: $('#cT').value})); closeModal(); toast('Sinf yaratildi'); load(); return; }
    if (f.id === 'atForm') { const ids = [...f.querySelectorAll('input:checked')].map(x => x.value); if (ids.length > 2) { toast("Ko'pi bilan 2 ta o'qituvchi"); return; } const cid = f.dataset.id;
      await q(sb.from('class_teachers').delete().eq('class_id', cid)); if (ids.length) await q(sb.from('class_teachers').insert(ids.map((t, i) => ({class_id: cid, teacher_id: t, is_primary: i === 0})))); closeModal(); load(); return; }
    if (f.id === 'gForm') { await q(sb.from('groups').insert({class_id: f.dataset.id, name: $('#gN').value.trim()})); closeModal(); toast('Guruh yaratildi'); load(); return; }
    if (f.id === 'sForm') { const n = $('#sN').value.trim(); const pm = (f.querySelector('input[name=pm]:checked') || {}).value || 'new';
      if (pm === 'old' && !$('#sPL').value.trim()) { toast('Ota-ona loginini yozing'); return; }
      const u = await fn({role: 'student', full_name: n, login: $('#sL').value.trim(), group_id: f.dataset.id}); let extra = '';
      try {
        if (pm === 'new') { const p = await fn({role: 'parent', full_name: $('#sPN').value.trim() || n + 'ning ota-onasi', login: 'ota.' + u.login, child_id: u.id}); extra = credsBox(p, 'Ota-ona'); }
        if (pm === 'old') { const r = await q(sb.rpc('link_parent', {p_login: $('#sPL').value.trim(), p_student: u.id})); extra = `<div class="ask"><b>Ota-ona biriktirildi</b><div>${esc(r.full_name)} (<b>${esc(r.login)}</b>)</div><span class="muted" style="font-size:13px">Endi u bitta login bilan ko'radi: ${esc(r.children)}</span></div>`; }
      } catch (err) { extra = `<div class="ask" style="color:var(--bad)">O'quvchi qo'shildi, lekin ota-ona bog'lanmadi: ${esc(err.message)}. «👪 Ota-ona» tugmasi orqali qayta urinib ko'ring.</div>`; }
      modal(`<h2>${esc(n)} qo'shildi</h2>${credsBox(u, "O'quvchi")}${extra}<button class="btn p" data-act="closeReload">Tayyor</button>`); return; }
    if (f.id === 'parLink') { const r = await q(sb.rpc('link_parent', {p_login: $('#plL').value.trim(), p_student: f.dataset.id})); toast(r.full_name + ' biriktirildi'); $('#plL').value = ''; loadParents(f.dataset.id); return; }
    if (f.id === 'parNew') { const sid = f.dataset.id; const st = D.P[sid] || {};
      const p = await fn({role: 'parent', full_name: $('#pnN').value.trim() || (st.full_name || '') + 'ning ota-onasi', login: 'ota.' + (st.login || 'user'), child_id: sid});
      modal(`<h2>Ota-ona logini yaratildi</h2>${credsBox(p, 'Ota-ona')}<button class="btn p" data-act="closeReload">Tayyor</button>`); return; }
    if (f.id === 'hwForm') { const t = $('#hwT').value.trim(); if (!t) { toast('Vazifa nomini yozing'); return; }
      await q(sb.from('assignments').insert({type: 'written', title: t, instructions: $('#hwI').value.trim(), target_group_id: $('#hwG').value, due_at: new Date($('#hwD').value).toISOString(), created_by: me.id})); closeModal(); view = 'homework'; toast('Vazifa berildi'); load(); return; }
    if (f.id === 'watchForm') { const url = ytEmbed($('#wtU').value); if (!url) { toast("YouTube havolasi noto'g'ri"); return; }
      const qs = $('#wtQ').value.split(/\n\s*\n/).map(bl => bl.split('\n').map(x => x.trim()).filter(Boolean)).filter(bl => bl.length >= 3).map(bl => { const o = bl.slice(1); const a = o.findIndex(x => x.startsWith('*')); return {q: bl[0], o: o.map(x => x.replace(/^\*\s*/, '')), a}; });
      if (!qs.length) { toast("Kamida 1 ta savol yozing (savol + 2 variant)"); return; }
      if (qs.some(x => x.a < 0)) { toast("Har savolda to'g'ri javob oldiga * qo'ying"); return; }
      await q(sb.from('watching_time').insert({week_start: weekStart(), class_id: $('#wtC').value, title: $('#wtT').value.trim(), youtube_embed_url: url, questions: qs, created_by: me.id})); closeModal(); view = 'watch'; toast('Video qo\'shildi'); load(); return; }
    if (f.id === 'watchAns') { const w = D.wt.find(x => x.id === f.dataset.id); const ans = (w.questions || []).map((x, i) => { const r = f.querySelector(`input[name=wq${i}]:checked`); return r ? +r.value : null; });
      const r = await q(sb.rpc('submit_watching', {p_id: w.id, p_answers: ans}));
      modal(`<div style="text-align:center;display:grid;gap:10px"><div style="font-size:44px">🎬</div><h2>${r.correct}/${r.total} to'g'ri (${r.percent}%)</h2><p style="margin:0">${r.bonus ? '+' + r.bonus + ' bonus ball haftalik reytingga!' : "Keyingi safar diqqat bilan ko'ring!"}</p><button class="btn p" data-act="closeReload">Davom etish</button></div>`); return; }
    if (f.id === 'badgeForm') { await q(sb.from('student_badges').insert({student_id: $('#bdS').value, badge_id: $('#bdB').value, awarded_by: me.id})); toast('Nishon berildi'); load(); return; }
    if (f.id === 'annForm') { const [aud, tid] = $('#annA').value.split(':'); const t = $('#annT').value.trim(), bd = $('#annB').value.trim();
      if (!t || !bd) { toast("Sarlavha va matnni yozing"); return; }
      await q(sb.from('announcements').insert({author_id: me.id, audience: aud, target_id: tid || null, title: t, body: bd})); closeModal(); view = 'announce'; toast("E'lon yuborildi"); load(); return; }
    if (f.id === 'liveForm') { const d = $('#lvD').value; if (!d) { toast('Vaqtni tanlang'); return; }
      const url = $('#lvU').value.trim(); if (url && !/^https:\/\//.test(url)) { toast('Havola https:// bilan boshlansin'); return; }
      await q(sb.from('live_sessions').insert({group_id: $('#lvG').value, teacher_id: me.id, starts_at: new Date(d).toISOString(), duration_minutes: Math.max(10, +$('#lvM').value || 45), google_meet_url: url || null})); closeModal(); view = 'live'; toast('Dars rejalashtirildi'); load(); return; }
    if (f.id === 'pwForm') { const p1 = $('#pw1').value, p2 = $('#pw2').value;
      if (p1.length < 6) { toast("Parol kamida 6 belgi bo'lsin"); return; } if (p1 !== p2) { toast('Parollar bir xil emas'); return; }
      if (/^demo\./.test(me.login || '')) { toast("Demo akkauntda parolni almashtirib bo'lmaydi"); return; }
      const { error } = await sb.auth.updateUser({password: p1}); if (error) { toast(error.message); return; }
      closeModal(); toast('Parol almashtirildi'); return; }
    if (f.id === 'fbForm') { const t = $('#fbT').value.trim(); if (t.length < 2) { toast('Fikringizni yozing'); return; } await q(sb.from('feedback').insert({author_id: me.id, page: ROLE_UZ[me.role] + ' · ' + (view || ''), body: t})); closeModal(); toast('Rahmat! Fikringiz yuborildi.'); return; }
    if (f.id === 'lsForm') { const title = $('#lsT').value.trim(); if (!title) { toast('Mavzuni yozing'); return; }
      const l = await q(sb.from('lessons').insert({owner_id: me.id, title, objective: $('#lsO').value.trim() || null, is_template: !!($('#lsTpl') && $('#lsTpl').checked), position: D.lessons.length + 1}).select().single());
      const url = $('#lsV').value.trim(); let pos = 0;
      const rows = Object.keys(SEC_UZ).map(k => ({k, t: $('#ls_' + k).value.trim()})).filter(x => x.t || (url && x.k === 'warm_up')).map(x => ({lesson_id: l.id, section_type: x.k, title: SEC_UZ[x.k], content: {text: x.t, ...(url && x.k === 'warm_up' ? {url} : {})}, position: ++pos}));
      if (url && !rows.length) rows.push({lesson_id: l.id, section_type: 'listening', title: 'Listening', content: {text: '', url}, position: 1});
      if (rows.length) await q(sb.from('lesson_sections').insert(rows));
      closeModal(); toast('Dars saqlandi'); load(); return; }
    if (f.id === 'subForm') { const t = $('#subT').value.trim(); if (t.length < 5) { toast('Javob juda qisqa'); return; } const aid = f.dataset.id; const s = D.subs.find(x => x.assignment_id === aid);
      let sid = s?.id;
      if (s) await q(sb.from('submissions').update({text_answer: t}).eq('id', s.id)); else sid = (await q(sb.from('submissions').insert({assignment_id: aid, student_id: me.id, text_answer: t}).select('id').single())).id;
      closeModal(); toast("Yuborildi! O'qituvchi tekshiradi."); load();
      if (sid) aiCheck(sid, true); // AI oldindan baholaydi (o'quvchiga ko'rinmaydi, o'qituvchi tasdiqlaydi)
      return; }
  } catch (err) { toast(err.message || 'Xato'); }
  finally { busy = false; if (btn) btn.disabled = false; }
});

sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { me = null; render(); } });
boot();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
