-- Northstar Telegram bot (ota-onalar uchun): bog'lash, eslatma, haftalik hisobot, baho xabari
begin;
create extension if not exists pg_net;

create table if not exists public.telegram_links (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  chat_id bigint unique,
  link_code text unique,
  code_expires timestamptz,
  linked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.telegram_links enable row level security;
drop policy if exists tl_self_select on public.telegram_links;
create policy tl_self_select on public.telegram_links for select using (profile_id = (select auth.uid()));

-- Saytdagi "Telegram'ga ulash" tugmasi: 6 xonali kod beradi (15 daqiqa)
create or replace function public.telegram_link_code() returns text
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare c text;
begin
  if auth.uid() is null then raise exception 'Kirish kerak'; end if;
  c := lpad((floor(random() * 1000000))::int::text, 6, '0');
  insert into public.telegram_links (profile_id, link_code, code_expires) values (auth.uid(), c, now() + interval '15 minutes')
  on conflict (profile_id) do update set link_code = excluded.link_code, code_expires = excluded.code_expires;
  return c;
end $$;
grant execute on function public.telegram_link_code() to authenticated;

create or replace function public.telegram_unlink() returns void
language sql security definer set search_path to 'public','pg_temp' as $$
  update public.telegram_links set chat_id = null, linked_at = null where profile_id = auth.uid();
$$;
grant execute on function public.telegram_unlink() to authenticated;

-- Bot sozlamalari (token va server URL) private sxemada saqlanadi
create table if not exists private.bot_config (k text primary key, v text not null);
revoke all on private.bot_config from public, anon, authenticated;

create or replace function private.tg_send(p_chat bigint, p_text text) returns void
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare tok text;
begin
  select v into tok from private.bot_config where k = 'tg_token';
  if tok is null or p_chat is null then return; end if;
  perform net.http_post(url := 'https://api.telegram.org/bot' || tok || '/sendMessage',
    body := jsonb_build_object('chat_id', p_chat, 'text', p_text, 'parse_mode', 'HTML', 'disable_web_page_preview', true),
    headers := '{"Content-Type":"application/json"}'::jsonb);
end $$;

-- Farzandning ota-onalari (va o'quvchining o'zi, agar ulangan bo'lsa) chat_id lari
create or replace function private.tg_chats_for_student(p_student uuid) returns setof bigint
language sql stable security definer set search_path to 'public','pg_temp' as $$
  select tl.chat_id from public.telegram_links tl
   where tl.chat_id is not null and (tl.profile_id = p_student
      or tl.profile_id in (select parent_id from public.parent_students where student_id = p_student));
$$;

create or replace function private.esc_html(t text) returns text language sql immutable as $$
  select replace(replace(replace(coalesce(t,''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$$;

-- Baho tasdiqlanganda darhol xabar
create or replace function private.tg_grade_notify() returns trigger
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare s record; c bigint;
begin
  if new.approved_at is null or (tg_op = 'UPDATE' and old.approved_at is not null) then return new; end if;
  select sub.student_id, p.full_name, a.title into s from public.submissions sub
    join public.profiles p on p.id = sub.student_id join public.assignments a on a.id = sub.assignment_id where sub.id = new.submission_id;
  for c in select private.tg_chats_for_student(s.student_id) loop
    perform private.tg_send(c, '✅ <b>' || private.esc_html(s.full_name) || '</b> uy vazifasi baholandi' || chr(10) ||
      '📘 ' || private.esc_html(s.title) || chr(10) || '⭐ Ball: <b>' || coalesce(new.final_score::text, '—') || '/100</b>' || chr(10) ||
      '💬 ' || private.esc_html(new.final_feedback));
  end loop;
  return new;
end $$;
drop trigger if exists trg_tg_grade on public.submission_grades;
create trigger trg_tg_grade after insert or update of approved_at on public.submission_grades for each row execute function private.tg_grade_notify();

-- E'lon chiqqanda ota-onalarga
create or replace function private.tg_announce_notify() returns trigger
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare c bigint;
begin
  for c in
    select distinct tl.chat_id from public.telegram_links tl join public.profiles p on p.id = tl.profile_id
     where tl.chat_id is not null and (
       new.audience = 'school'
       or (new.audience = 'parents' and p.role = 'parent')
       or (new.audience = 'teachers' and p.role in ('teacher','head_teacher'))
       or (new.audience in ('group','class') and tl.profile_id in (
            select st.profile_id from public.students st join public.groups g on g.id = st.group_id
             where (new.audience = 'group' and g.id = new.target_id) or (new.audience = 'class' and g.class_id = new.target_id)
            union select ps.parent_id from public.parent_students ps join public.students st on st.profile_id = ps.student_id join public.groups g on g.id = st.group_id
             where (new.audience = 'group' and g.id = new.target_id) or (new.audience = 'class' and g.class_id = new.target_id))))
  loop
    perform private.tg_send(c, '📢 <b>' || private.esc_html(new.title) || '</b>' || chr(10) || private.esc_html(new.body));
  end loop;
  return new;
end $$;
drop trigger if exists trg_tg_announce on public.announcements;
create trigger trg_tg_announce after insert on public.announcements for each row execute function private.tg_announce_notify();

-- Kechki eslatma (19:00): challenge qilinmagan yoki muddati yaqin vazifa topshirilmagan bo'lsa
create or replace function private.tg_daily_reminders() returns int
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare r record; c bigint; n int := 0; d date := (now() at time zone 'Asia/Tashkent')::date; msg text; hw text;
begin
  for r in select st.profile_id sid, p.full_name, st.group_id from public.students st join public.profiles p on p.id = st.profile_id loop
    msg := '';
    if not exists (select 1 from public.daily_challenges where student_id = r.sid and challenge_date = d) then
      msg := msg || '🔥 Bugungi Daily Challenge hali bajarilmagan (1 daqiqa).' || chr(10);
    end if;
    select string_agg('📝 ' || private.esc_html(a.title) || ' — ' || to_char(a.due_at at time zone 'Asia/Tashkent', 'DD.MM HH24:MI') || ' gacha', chr(10)) into hw
      from public.assignments a where a.target_group_id = r.group_id and a.is_published and a.due_at between now() and now() + interval '36 hours'
       and not exists (select 1 from public.submissions s where s.assignment_id = a.id and s.student_id = r.sid);
    if hw is not null then msg := msg || hw || chr(10); end if;
    if msg <> '' then
      for c in select private.tg_chats_for_student(r.sid) loop
        perform private.tg_send(c, '⏰ <b>' || private.esc_html(r.full_name) || '</b>' || chr(10) || msg); n := n + 1;
      end loop;
    end if;
  end loop;
  return n;
end $$;

-- Haftalik hisobot (yakshanba 20:00)
create or replace function private.tg_weekly_reports() returns int
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare r record; c bigint; n int := 0; wk date := date_trunc('week', now() at time zone 'Asia/Tashkent')::date; t text;
begin
  for r in select l.student_id, l.full_name, l.score, l.streak, l.group_id,
                  rank() over (partition by l.group_id order by l.score desc) rnk,
                  count(*) over (partition by l.group_id) tot
             from private.live_scores((select array_agg(id) from public.groups)) l loop
    t := '📊 <b>Haftalik hisobot · ' || private.esc_html(r.full_name) || '</b>' || chr(10) ||
         '⭐ Haftalik ball: <b>' || r.score || '</b>' || chr(10) ||
         '🏆 Guruhda: ' || r.rnk || '/' || r.tot || '-o''rin' || chr(10) ||
         '🔥 Streak: ' || r.streak || ' kun' || chr(10) ||
         '✅ Challenge: ' || (select count(*) from public.daily_challenges where student_id = r.student_id and challenge_date >= wk) || '/7 kun' || chr(10) ||
         '📝 Topshirilgan vazifalar: ' || (select count(*) from public.submissions where student_id = r.student_id and submitted_at >= wk) || chr(10) ||
         coalesce('🏅 Yangi nishonlar: ' || (select string_agg(b.icon || ' ' || b.name_uz, ', ') from public.student_badges sb join public.badges b on b.id = sb.badge_id
                                           where sb.student_id = r.student_id and sb.awarded_at >= wk) || chr(10), '') ||
         coalesce('📚 Keyingi mavzu: ' || (select l2.title from public.groups g join lateral (
              select le.title from public.lessons le join public.units u on u.id = le.unit_id where le.is_template order by u.position, le.position offset g.current_topic + 1 limit 1) l2 on true
              where g.id = r.group_id), '');
    for c in select private.tg_chats_for_student(r.student_id) loop
      perform private.tg_send(c, t); n := n + 1;
    end loop;
  end loop;
  return n;
end $$;
commit;

-- Bot sozlamasi (token bu yerda yo'q — bazada private.bot_config da):
-- insert into private.bot_config (k,v) values ('tg_token','<BOT_TOKEN>'),('tg_webhook_secret','<SECRET>');
-- create or replace function public.bot_cfg(p_k text) returns text language sql stable security definer set search_path to 'public','pg_temp' as $$ select v from private.bot_config where k = p_k $$;
-- revoke all on function public.bot_cfg(text) from public, anon, authenticated; grant execute on function public.bot_cfg(text) to service_role;
-- pg_cron: 19:00 eslatma, yakshanba 20:00 hisobot (Toshkent)
-- select cron.schedule('northstar_tg_daily', '0 14 * * *', 'select private.tg_daily_reminders()');
-- select cron.schedule('northstar_tg_weekly', '0 15 * * 0', 'select private.tg_weekly_reports()');
