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
const TOPICS = [
  {t:'A / An — Indefinite Articles', ask:[['"Bir olma" inglizcha qanday?','an apple'],['"Bir kitob" inglizcha qanday?','a book'],['"egg" oldidan a yoki an?','an']]},
  {t:'Plurals — Regular Plural Nouns', ask:[['"cat" ko\'plikda?','cats'],['"box" ko\'plikda?','boxes'],['"bus" ko\'plikda?','buses']]},
  {t:'Plurals — Irregular Plurals', ask:[['"child" ko\'plikda?','children'],['"man" ko\'plikda?','men'],['"tooth" ko\'plikda?','teeth']]},
  {t:'Personal Pronouns', ask:[['"U (qiz)" inglizcha?','she'],['"Biz" inglizcha?','we'],['"Ular" inglizcha?','they']]},
  {t:'The Verb "To Be" — Am / Is / Are', ask:[['I ___ a student.','am'],['She ___ my sister.','is'],['They ___ friends.','are']]},
  {t:'"To Be" — Questions & Negatives', ask:[['"Are you happy?" — qisqa javob (ha)','Yes, I am.'],['"He is not tired" — qisqartirib','He isn\'t tired.'],['"Is it a cat?" (yo\'q)','No, it isn\'t.']]},
  {t:'Progress Check — Unit 1', ask:[['"woman" ko\'plikda?','women'],['We ___ in class 5.','are'],['___ umbrella (a/an)','an']]}
];
/* t = topic index in TOPICS: the daily challenge uses questions of the group's current topic */
const BANK = [
  {t:0, q:'Choose the correct article: ___ orange', o:['a','an'], a:1},
  {t:0, q:'Choose the correct article: ___ pen', o:['a','an'], a:0},
  {t:0, q:'Choose the correct article: ___ umbrella', o:['a','an'], a:1},
  {t:0, q:'Choose the correct article: ___ hour', o:['a','an'], a:1},
  {t:0, q:'Choose the correct article: ___ book', o:['a','an'], a:0},
  {t:1, q:'Choose the plural: one box, two ___', o:['boxs','boxes','box'], a:1},
  {t:1, q:'Choose the plural: one cat, two ___', o:['cats','cates','cat'], a:0},
  {t:1, q:'Choose the plural: one baby, two ___', o:['babys','babies','babyes'], a:1},
  {t:1, q:'Choose the plural: one bus, two ___', o:['buss','buses','bus'], a:1},
  {t:2, q:'Choose the plural: one child, two ___', o:['childs','children','childrens'], a:1},
  {t:2, q:'Choose the plural: one foot, two ___', o:['foots','feet','feets'], a:1},
  {t:2, q:'Choose the plural: one man, two ___', o:['mans','men','mens'], a:1},
  {t:2, q:'Choose the plural: one mouse, two ___', o:['mouses','mice','mices'], a:1},
  {t:3, q:'Choose the pronoun: Ali is my friend. ___ is 11.', o:['She','He','It'], a:1},
  {t:3, q:'Choose the pronoun: Madina and I are classmates. ___ like English.', o:['They','We','You'], a:1},
  {t:3, q:'Choose the pronoun: I like Madina. I like ___.', o:['she','her','hers'], a:1},
  {t:3, q:'Choose the pronoun: The books are on the desk. ___ are new.', o:['It','They','Them'], a:1},
  {t:4, q:'Fill in the gap: I ___ eleven years old.', o:['am','is','are'], a:0},
  {t:4, q:'Fill in the gap: My mother ___ a teacher.', o:['am','is','are'], a:1},
  {t:4, q:'Fill in the gap: We ___ in class 5-A.', o:['am','is','are'], a:2},
  {t:4, q:'Fill in the gap: It ___ a big school.', o:['am','is','are'], a:1},
  {t:5, q:'Put the words in order: you / are / happy / ?', o:['Are you happy?','You are happy?','Happy are you?'], a:0},
  {t:5, q:'Choose the short answer: Is it a dog? (no)', o:['No, it isn\'t.','No, it not.','No, isn\'t it.'], a:0},
  {t:5, q:'Choose the negative: She is tired.', o:['She isn\'t tired.','She not tired.','She aren\'t tired.'], a:0},
  {t:5, q:'Choose the question: They are at home.', o:['Are they at home?','They are at home?','Is they at home?'], a:0},
  {t:6, q:'Choose the correct sentence.', o:['They are my friends.','They is my friends.','They are my friend.'], a:0},
  {t:6, q:'Match the word: "kitob"', o:['book','bag','boot'], a:0},
  {t:6, q:'Match the word: "oila"', o:['family','father','friend'], a:0},
  {t:6, q:'Choose the correct sentence.', o:['He is an teacher.','He is a teacher.','He are a teacher.'], a:1}
];
function challengePool(topic) {
  const shuffle = arr => [...arr].sort(() => Math.random() - .5);
  let pool = shuffle(BANK.filter(x => x.t === topic));
  if (pool.length < 3) pool = pool.concat(shuffle(BANK.filter(x => x.t < topic)));
  if (pool.length < 3) pool = pool.concat(shuffle(BANK.filter(x => !pool.includes(x))));
  return pool.slice(0, 3);
}

let me = null, view = null, D = {}, busy = false;
const ROLE_UZ = {head_teacher:'Head teacher', teacher:"O'qituvchi", student:"O'quvchi", parent:'Ota-ona'};

async function q(p) { const { data, error } = await p; if (error) { console.error(error); throw error; } return data; }
async function fn(body) {
  const { data: { session } } = await sb.auth.getSession();
  const r = await fetch(SB_URL + '/functions/v1/create-user', {method:'POST', headers:{'Content-Type':'application/json', apikey:SB_KEY, Authorization:'Bearer ' + session.access_token}, body: JSON.stringify(body)});
  const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Xato'); return j;
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
  const [lessons, feedback] = await Promise.all([
    q(sb.from('lessons').select('*, lesson_sections(*)').order('position')),
    me.role === 'head_teacher' ? q(sb.from('feedback').select('*').order('created_at', {ascending:false})) : []
  ]);
  const P = Object.fromEntries(profiles.map(x => [x.id, x]));
  const score = Object.fromEntries(scores.map(x => [x.student_id, x]));
  D = {classes, ct, groups, students, P, assignments, subs, score, lessons, feedback};
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
  const lessons = await q(sb.from('lessons').select('*, lesson_sections(*)').order('position'));
  D = {group, assignments, subs, grades, streak, todayCh, board, lessons};
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
  D = {kids, active, kid, group, assignments, subs, grades, streak, board};
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
    ? [['home','Bosh sahifa'],['teachers',"O'qituvchilar"],['classes','Sinflar'],['lessons','Namuna darslar'],['homework','Uy vazifalar'],['check','Tekshirish'],['rating','Reyting'],['feedback','Fikrlar']]
    : [['home','Bosh sahifa'],['classes','Mening sinflarim'],['lessons','Darslarim'],['homework','Uy vazifalar'],['check','Tekshirish'],['rating','Reyting']];
  if (!view || !items.some(i => i[0] === view)) view = 'home';
  const pc = pending().length;
  const nav = items.map(([k, l]) => `<button class="nav ${view === k ? 'on' : ''}" data-nav="${k}">${l}${k === 'check' && pc ? `<span class="pill p-warn">${pc}</span>` : ''}</button>`).join('');
  const body = ({home: head ? headHome : teacherHome, teachers: headTeachers, classes: classesView, lessons: lessonsView, homework: homeworkView, check: checkView, rating: ratingView, feedback: feedbackView})[view]();
  return `<div class="shell"><aside class="side"><div class="brand" style="color:var(--primary)">${STAR}<b>NORTHSTAR</b></div>${nav}
    <div class="me"><b>${esc(me.full_name)}</b><div class="muted">${ROLE_UZ[me.role]} · ${esc(me.login)}</div><button class="btn sm o" data-act="logout" style="margin-top:8px">Chiqish</button></div></aside>
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
  <h2 style="font-size:18px">Namuna darslar · Unit 1 (${tpl.length})</h2>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">${tpl.map(l => lessonCard(l, head ? '' : (mine.some(m => m.copied_from === l.id) ? '<span class="pill p-ok">Nusxa olingan</span>' : `<button class="btn sm p" data-act="copyLesson" data-id="${l.id}">Nusxa olish</button>`))).join('') || `<div class="empty">Namuna dars yo'q</div>`}</div>`;
}
function feedbackView() {
  return `<h1 style="font-size:28px">Fikrlar</h1><p class="muted" style="margin:0">Foydalanuvchilar «Fikr bildirish» tugmasi orqali yozgan takliflar.</p>
  ${D.feedback.length ? D.feedback.map(f => `<div class="card stack"><div class="between"><b>${esc(D.P[f.author_id]?.full_name || 'Foydalanuvchi')}</b><span class="muted" style="font-size:13px">${fmt(f.created_at)} · ${esc(f.page || '')}</span></div><div style="white-space:pre-wrap">${esc(f.body)}</div><div>${f.status === 'done' ? '<span class="pill p-ok">Bajarildi</span>' : `<button class="btn sm s" data-act="fbDone" data-id="${f.id}">Bajarildi deb belgilash</button>`}</div></div>`).join('') : `<div class="empty">Hali fikr yo'q.</div>`}`;
}
function openLesson(id) {
  const l = D.lessons.find(x => x.id === id); if (!l) return;
  const secs = (l.lesson_sections || []).sort((a, b) => a.position - b.position);
  modal(`<div class="between"><h2>${esc(l.title)}</h2><button class="btn sm o" data-act="close">Yopish</button></div>${l.objective ? `<p class="muted" style="margin:0">${esc(l.objective)}</p>` : ''}
  ${secs.map(s => `<div class="stack" style="border-top:1px solid var(--border);padding-top:10px"><span class="pill p-info" style="justify-self:start">${SEC_UZ[s.section_type]}</span><div style="white-space:pre-wrap">${esc(s.content?.text || '')}</div>${s.content?.url ? `<a href="${esc(s.content.url)}" target="_blank" rel="noopener">Video / material ↗</a>` : ''}</div>`).join('')}`);
}
function kpi(l, v, color) { return `<div class="card kpi"><div class="l">${l}</div><div class="v num" ${color ? `style="color:${color}"` : ''}>${v}</div></div>`; }
function teacherHome() {
  const st = myGroups().flatMap(g => groupStudents(g.id).map(s => ({s, g})));
  const c = {ok:0, warn:0, bad:0}; const rows = [];
  st.forEach(({s, g}) => { const x = stStatus(s.profile_id, g.id); c[x[0]]++; if (x[0] !== 'ok') rows.push({s, g, x}); });
  const avg = st.length ? Math.round(st.reduce((a, {s}) => a + Number((D.score[s.profile_id] || {}).score || 0), 0) / st.length) : 0;
  return `<div class="between"><div><h1 style="font-size:28px">Xayrli kun, ${esc(me.full_name)}</h1><p class="muted" style="margin:4px 0 0">${myClasses().length} sinf · ${myGroups().length} guruh · ${pending().length} ta ish tekshirishni kutmoqda</p></div>
    <div class="row"><button class="btn s" data-nav="classes">+ O'quvchi qo'shish</button><button class="btn p" data-act="newHw">+ Uy vazifa berish</button></div></div>
    <div class="kpis">${kpi("O'quvchilar", st.length)}${kpi('Tekshirilmagan', pending().length, 'var(--warn)')}${kpi("O'rtacha ball", avg)}
      <div class="card kpi"><div class="l">Svetofor</div><div class="row num" style="margin-top:8px"><span class="pill p-ok">${c.ok}</span><span class="pill p-warn">${c.warn}</span><span class="pill p-bad">${c.bad}</span></div></div></div>
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
       ${groupStudents(g.id).length ? `<div class="tbl-wrap"><table><tr><th>O'quvchi</th><th>Login</th><th>Holat</th><th>Ball</th><th>Streak</th></tr>${groupStudents(g.id).map(s => { const x = stStatus(s.profile_id, g.id); const sc = D.score[s.profile_id] || {}; return `<tr><td><b>${esc(D.P[s.profile_id]?.full_name)}</b></td><td class="muted">${esc(D.P[s.profile_id]?.login)}</td><td><span class="pill p-${x[0]}">${esc(x[1])}</span></td><td class="num">${sc.score ?? '—'}</td><td class="num">${sc.streak ?? 0}</td></tr>`; }).join('')}</table></div>` : `<div class="empty">Guruhda o'quvchi yo'q</div>`}</div>`).join('') || `<div class="muted">Guruh yo'q — «+ Guruh» tugmasini bosing.</div>`}</section>`).join('') : `<div class="empty">${head ? "Hali sinf yo'q." : 'Sizga hali sinf biriktirilmagan. Head teacherga murojaat qiling.'}</div>`}`;
}
function homeworkView() {
  const gids = new Set(myGroups().map(g => g.id));
  const hws = D.assignments.filter(a => gids.has(a.target_group_id));
  return `<div class="between"><h1 style="font-size:28px">Uy vazifalar</h1><button class="btn p" data-act="newHw">+ Uy vazifa berish</button></div>
  ${hws.length ? hws.map(h => { const st = groupStudents(h.target_group_id); const n = st.filter(s => D.subs.some(x => x.assignment_id === h.id && x.student_id === s.profile_id)).length; const g = D.groups.find(x => x.id === h.target_group_id);
    return `<div class="card stack"><div class="between"><b>${esc(h.title)}</b><span class="pill p-info">${esc(g?.name)}</span></div><div class="muted" style="font-size:14px;white-space:pre-wrap">${esc(h.instructions)}</div><div class="between"><span class="muted" style="font-size:13px">Muddat: ${fmt(h.due_at)}</span><span class="num" style="font-size:13px"><b>${n}/${st.length}</b> topshirdi</span></div><div class="bar"><i style="width:${st.length ? n / st.length * 100 : 0}%"></i></div></div>`; }).join('') : `<div class="empty">Hali vazifa berilmagan.</div>`}`;
}
function checkView() {
  const list = pending();
  return `<h1 style="font-size:28px">Tekshirish</h1><p class="muted" style="margin:0">Baho va izoh qo'ying. Tasdiqlanmaguncha o'quvchi natijani ko'rmaydi.</p>
  ${list.length ? list.map(s => { const a = D.assignments.find(x => x.id === s.assignment_id); const g = s.submission_grades || {};
    return `<div class="card stack"><div class="between"><b>${esc(D.P[s.student_id]?.full_name)} · ${esc(a?.title)}</b>${s.is_late ? '<span class="pill p-warn">Kechikkan</span>' : ''}</div>
    <div style="white-space:pre-wrap;background:var(--bg);border-radius:12px;padding:12px">${esc(s.text_answer)}</div>
    <div class="row"><div class="field" style="width:120px"><label for="sc_${s.id}">Ball (0–100)</label><input id="sc_${s.id}" type="number" min="0" max="100" value="${g.ai_score ?? ''}"></div>
     <div class="field" style="flex:1;min-width:220px"><label for="fb_${s.id}">Izoh (keyingi qadam)</label><input id="fb_${s.id}" value="${esc(g.ai_feedback || '')}" placeholder="Masalan: Check Past Simple -ed endings."></div></div>
    <div class="row"><button class="btn sm p" data-act="approve" data-id="${s.id}">Tasdiqlash</button><button class="btn sm t" data-act="return" data-id="${s.id}">Qayta ishlashga qaytarish</button></div></div>`; }).join('') : `<div class="empty">Tekshiriladigan ish yo'q.</div>`}`;
}
function ratingView() {
  return `<h1 style="font-size:28px">Reyting</h1><p class="muted" style="margin:0">Haftalik ball: vazifa bajarilishi 30%, sifati 30%, Daily Challenge 20%, faollik 20% + streak bonusi (maks. 100).</p>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">${myClasses().map(c => { const r = Object.values(D.score).filter(x => x.class_id === c.id).sort((a, b) => b.score - a.score); const avg = r.length ? Math.round(r.reduce((a, x) => a + Number(x.score), 0) / r.length) : 0;
    return `<section class="card stack"><div class="between"><h2 style="font-size:18px">${esc(c.name)}</h2><span class="muted" style="font-size:13px">o'rtacha <b class="num" style="color:var(--text)">${avg}</b></span></div><div class="lb">${r.slice(0, 3).map((x, i) => `<div class="lb-row"><span class="medal" style="background:${medal(i)}">${i + 1}</span><span class="n">${esc(x.full_name)}</span><b class="num">${x.score}</b></div>`).join('') || `<div class="empty">O'quvchi yo'q</div>`}</div></section>`; }).join('') || `<div class="empty">Sinf yo'q</div>`}</div>`;
}

/* student */
function studentView() {
  if (!view || !['home','lessons','tasks','results','rating'].includes(view)) view = 'home';
  const g = D.group; const k = D.streak && D.streak.last_completed_date >= new Date(Date.now() - 864e5).toLocaleDateString('en-CA', {timeZone:'Asia/Tashkent'}) ? D.streak.current_streak : 0;
  const subOf = id => D.subs.find(s => s.assignment_id === id);
  const open = D.assignments.filter(a => { const s = subOf(a.id); return !s || s.status === 'returned'; });
  const topic = TOPICS[(g?.current_topic || 0) % TOPICS.length];
  let body = '';
  if (view === 'home') {
    const last = D.grades.filter(x => x.status === 'approved').sort((a, b) => String(b.approved_at).localeCompare(String(a.approved_at)))[0];
    body = `<div class="between"><div><div class="muted" style="font-size:13px">Xayrli kun</div><h1 style="font-size:24px">Salom, ${esc(me.full_name.split(' ')[0])}!</h1></div><span class="streak num">🔥 ${k} kun</span></div>
    <div class="card stack"><div class="between" style="font-size:13px"><b>${esc(g?.name || '')}</b><span class="muted">Mavzu ${((g?.current_topic || 0) % TOPICS.length) + 1}/${TOPICS.length}</span></div><div class="bar"><i style="width:${(((g?.current_topic || 0) % TOPICS.length) + 1) / TOPICS.length * 100}%"></i></div><div class="muted" style="font-size:13px">${esc(topic.t)}</div></div>
    <div class="hero-card"><div style="font-size:12px;font-weight:600;letter-spacing:.06em;opacity:.8">DAILY CHALLENGE · 1 DAQIQA</div><div style="font-size:17px;font-weight:700">${D.todayCh ? 'Bugungi challenge bajarildi ✓ (' + D.todayCh.score + '/3)' : '3 ta savol — streakni saqlang'}</div>${D.todayCh ? '' : '<button class="btn" style="background:#fff;color:#1746A2" data-act="challenge">Boshlash</button>'}</div>
    <div class="card stack"><div class="between"><b>Vazifalar</b><span class="muted">${open.length} ta</span></div>${open.slice(0, 3).map(a => `<div class="between"><div><div style="font-weight:600">${esc(a.title)}</div><div style="font-size:12px;font-weight:600;color:${a.due_at && new Date(a.due_at) < new Date() ? 'var(--bad)' : 'var(--warn)'}">${fmt(a.due_at)} gacha</div></div><button class="btn sm s" data-act="submit" data-id="${a.id}">Topshirish</button></div>`).join('') || '<div class="muted">Hamma vazifa topshirilgan 🎉</div>'}</div>
    ${last ? `<div class="card row"><div class="num" style="font-size:28px;font-weight:700;color:var(--ok)">${last.final_score}</div><div style="min-width:0"><div style="font-size:13px;font-weight:600">Oxirgi natija · ${esc(D.assignments.find(a => a.id === last.assignment_id)?.title)}</div><div class="muted" style="font-size:13px">"${esc(last.final_feedback)}"</div></div></div>` : ''}`;
  } else if (view === 'tasks') {
    body = `<h1 style="font-size:24px">Vazifalar</h1>${D.assignments.map(a => { const s = subOf(a.id); const st = !s ? ['warn', 'Topshirilmagan'] : s.status === 'approved' ? ['ok', 'Baholandi'] : s.status === 'returned' ? ['bad', 'Qayta ishlash kerak'] : ['info', 'Tekshirilmoqda'];
      return `<div class="card stack"><div class="between"><b>${esc(a.title)}</b><span class="pill p-${st[0]}">${st[1]}</span></div><div class="muted" style="font-size:14px;white-space:pre-wrap">${esc(a.instructions)}</div><div class="between"><span class="muted" style="font-size:13px">${fmt(a.due_at)}</span>${!s || s.status === 'returned' ? `<button class="btn sm p" data-act="submit" data-id="${a.id}">Topshirish</button>` : ''}</div></div>`; }).join('') || `<div class="empty">Hali vazifa yo'q.</div>`}`;
  } else if (view === 'results') {
    const res = D.grades.filter(x => x.status === 'approved');
    const mine = D.board.find(x => x.student_id === me.id);
    body = `<h1 style="font-size:24px">Natijalar</h1><div class="kpis">${kpi('Haftalik ball', mine ? mine.score : '—')}${kpi('Streak', k)}</div>
    ${res.map(x => `<div class="card stack"><div class="between"><b>${esc(D.assignments.find(a => a.id === x.assignment_id)?.title)}</b><b class="num" style="color:var(--ok)">${x.final_score}/100</b></div><div class="muted">"${esc(x.final_feedback)}"</div></div>`).join('') || `<div class="empty">Baholangan ish hali yo'q.</div>`}`;
  } else if (view === 'lessons') {
    body = `<h1 style="font-size:24px">Darslar</h1>${D.lessons.map(l => lessonCard(l)).join('') || `<div class="empty">O'qituvchingiz hali dars qo'shmagan.</div>`}`;
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
    body += `<div class="card stack"><div class="muted" style="font-size:12px;font-weight:600;letter-spacing:.06em">HOZIRGI MAVZU</div><b style="font-size:16px">${esc(tp.t)}</b></div>
    <div class="ask"><b style="color:var(--primary)">Farzandingizdan so'rang</b>${tp.ask.map((x, i) => `<div><b>${i + 1}.</b> ${esc(x[0])} <span class="muted">— ${esc(x[1])}</span></div>`).join('')}</div>
    <div class="card stack"><div class="between"><span>${last ? esc(last.title) : "Vazifa yo'q"}</span>${last ? (lg ? `<span class="pill p-ok">Baholandi · ${lg.final_score}</span>` : ls ? '<span class="pill p-info">Topshirildi</span>' : '<span class="pill p-warn">Topshirilmagan</span>') : ''}</div>${lg ? `<div class="muted" style="font-size:14px">O'qituvchi: "${esc(lg.final_feedback)}"</div>` : ''}</div>`;
  } else {
    const k = D.streak ? D.streak.current_streak : 0;
    body += `<div class="kpis">${kpi('Haftalik ball', mine ? mine.score : '—')}${kpi('Streak', k)}</div>
    <div class="card stack"><div class="between"><span>Guruhda o'rni</span><b class="num">${mine ? mine.rnk + "-o'rin" : '—'}</b></div></div>${boardHtml(D.board, kid.profile_id, 'Guruh top-3')}`;
  }
  return phoneShell(body, [['home','Bugun',ICON.home],['stats','Statistika',ICON.cup]]);
}
function phoneShell(body, tabs) {
  return `<div class="phone">${body}<button class="btn o sm" data-act="fbOpen" style="justify-self:center">💬 Fikr bildirish</button></div><nav class="bottom"><div class="in" style="grid-template-columns:repeat(${tabs.length + 1},1fr)">${tabs.map(([k, l, i]) => `<button class="${view === k ? 'on' : ''}" data-nav="${k}">${i}${l}</button>`).join('')}<button data-act="logout">${ICON.out}Chiqish</button></div></nav>`;
}

/* ---------------- modals ---------------- */
function modal(html) { $('#modal').innerHTML = `<div class="modal" data-act="closeBg"><div class="box" role="dialog" aria-modal="true">${html}</div></div>`; const f = $('#modal input,#modal textarea,#modal select'); if (f) f.focus(); }
function closeModal() { $('#modal').innerHTML = ''; clearInterval(chal.timer); }
const credsBox = (u, who) => `<div class="ask">${who ? `<b>${who}</b>` : ''}<div>Login: <b>${esc(u.login)}</b></div><div>Parol: <b>${esc(u.password)}</b></div><span class="muted" style="font-size:13px">Saqlab qo'ying — parol boshqa ko'rsatilmaydi.</span></div>`;
const formBtns = l => `<div class="row"><button class="btn p" type="submit">${l}</button><button class="btn o" type="button" data-act="close">Bekor qilish</button></div>`;

const chal = {q: [], i: 0, score: 0, left: 60, timer: null};
function startChallenge() {
  Object.assign(chal, {q: challengePool((D.group?.current_topic || 0) % TOPICS.length), i: 0, score: 0, left: 60, answers: []});
  clearInterval(chal.timer);
  chal.timer = setInterval(() => { chal.left--; const t = $('#chT'); if (t) t.textContent = chal.left + ' s'; if (chal.left <= 0) finishChallenge(); }, 1000);
  drawChallenge();
}
function drawChallenge() {
  const x = chal.q[chal.i];
  modal(`<div class="between"><b>Daily Challenge · ${chal.i + 1}/3</b><span class="pill p-warn num" id="chT">${chal.left} s</span></div><div style="font-size:17px;font-weight:600">${esc(x.q)}</div><div class="stack">${x.o.map((o, i) => `<button class="q-opt" data-act="ans" data-i="${i}">${esc(o)}</button>`).join('')}</div>`);
}
async function finishChallenge() {
  clearInterval(chal.timer); if (chal.done) return; chal.done = true;
  try {
    await q(sb.from('daily_challenges').insert({student_id: me.id, challenge_date: todayISO(), questions: chal.q, answers: chal.answers, score: chal.score, completed_at: new Date().toISOString()}));
  } catch (e) { toast('Saqlanmadi: ' + e.message); }
  modal(`<div style="text-align:center;display:grid;gap:10px"><div style="font-size:40px">🔥</div><h2>${chal.score}/3 — ${chal.score === 3 ? 'Great job!' : chal.score ? 'Good try!' : 'Keep going!'}</h2><button class="btn p" data-act="closeReload">Davom etish</button></div>`);
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
  if (a === 'newStudent') return modal(`<h2>O'quvchi qo'shish · ${esc(D.groups.find(g => g.id === id).name)}</h2><form id="sForm" data-id="${id}" class="stack"><div class="field"><label for="sN">Ism familiya (lotin)</label><input id="sN" required></div><div class="field"><label for="sL">Login (ixtiyoriy)</label><input id="sL" autocapitalize="none"></div><label class="row"><input id="sP" type="checkbox" checked style="width:20px;height:20px"> Ota-ona uchun ham login yaratish</label>${formBtns("Qo'shish")}</form>`);
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
  if (a === 'fbDone') { try { await q(sb.from('feedback').update({status: 'done'}).eq('id', id)); load(); } catch (err) { toast(err.message); } return; }
  if (a === 'ans') { const x = chal.q[chal.i], i = +b.dataset.i; chal.answers.push(i);
    document.querySelectorAll('.q-opt').forEach((o, j) => { o.disabled = true; if (j === x.a) o.classList.add('ok'); else if (j === i) o.classList.add('no'); });
    if (i === x.a) chal.score++;
    setTimeout(() => { chal.i++; if (chal.i >= 3) finishChallenge(); else drawChallenge(); }, 700); return; }
});
document.addEventListener('change', e => { if (e.target.id === 'kidSel') { D.active = e.target.value; load(); } });
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
    if (f.id === 'sForm') { const n = $('#sN').value.trim(); const u = await fn({role: 'student', full_name: n, login: $('#sL').value.trim(), group_id: f.dataset.id}); let extra = '';
      if ($('#sP').checked) { const p = await fn({role: 'parent', full_name: n + 'ning ota-onasi', login: 'ota.' + u.login, child_id: u.id}); extra = credsBox(p, 'Ota-ona'); }
      modal(`<h2>${esc(n)} qo'shildi</h2>${credsBox(u, "O'quvchi")}${extra}<button class="btn p" data-act="closeReload">Tayyor</button>`); return; }
    if (f.id === 'hwForm') { const t = $('#hwT').value.trim(); if (!t) { toast('Vazifa nomini yozing'); return; }
      await q(sb.from('assignments').insert({type: 'written', title: t, instructions: $('#hwI').value.trim(), target_group_id: $('#hwG').value, due_at: new Date($('#hwD').value).toISOString(), created_by: me.id})); closeModal(); view = 'homework'; toast('Vazifa berildi'); load(); return; }
    if (f.id === 'fbForm') { const t = $('#fbT').value.trim(); if (t.length < 2) { toast('Fikringizni yozing'); return; } await q(sb.from('feedback').insert({author_id: me.id, page: ROLE_UZ[me.role] + ' · ' + (view || ''), body: t})); closeModal(); toast('Rahmat! Fikringiz yuborildi.'); return; }
    if (f.id === 'lsForm') { const title = $('#lsT').value.trim(); if (!title) { toast('Mavzuni yozing'); return; }
      const l = await q(sb.from('lessons').insert({owner_id: me.id, title, objective: $('#lsO').value.trim() || null, is_template: !!($('#lsTpl') && $('#lsTpl').checked), position: D.lessons.length + 1}).select().single());
      const url = $('#lsV').value.trim(); let pos = 0;
      const rows = Object.keys(SEC_UZ).map(k => ({k, t: $('#ls_' + k).value.trim()})).filter(x => x.t || (url && x.k === 'warm_up')).map(x => ({lesson_id: l.id, section_type: x.k, title: SEC_UZ[x.k], content: {text: x.t, ...(url && x.k === 'warm_up' ? {url} : {})}, position: ++pos}));
      if (url && !rows.length) rows.push({lesson_id: l.id, section_type: 'listening', title: 'Listening', content: {text: '', url}, position: 1});
      if (rows.length) await q(sb.from('lesson_sections').insert(rows));
      closeModal(); toast('Dars saqlandi'); load(); return; }
    if (f.id === 'subForm') { const t = $('#subT').value.trim(); if (t.length < 5) { toast('Javob juda qisqa'); return; } const aid = f.dataset.id; const s = D.subs.find(x => x.assignment_id === aid);
      if (s) await q(sb.from('submissions').update({text_answer: t}).eq('id', s.id)); else await q(sb.from('submissions').insert({assignment_id: aid, student_id: me.id, text_answer: t}));
      closeModal(); toast("Yuborildi! O'qituvchi tekshiradi."); load(); return; }
  } catch (err) { toast(err.message || 'Xato'); }
  finally { busy = false; if (btn) btn.disabled = false; }
});

sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { me = null; render(); } });
boot();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
