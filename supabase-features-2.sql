-- Northstar: xatolar daftari, test-vazifa, fayl/ovoz topshirish, o'zbekcha xulosa, mentor, sinflar musobaqasi
begin;

-- 1) Xatolar daftari: challenge'dagi xato javoblar ham yoziladi (topic='challenge', item = savol JSON)
create or replace function private.challenge_mistakes() returns trigger
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare i int; q jsonb; ans text;
begin
  if jsonb_typeof(new.questions) <> 'array' then return new; end if;
  for i in 0 .. jsonb_array_length(new.questions) - 1 loop
    q := new.questions -> i; ans := new.answers ->> i;
    if q ? 'a' and (ans is null or ans::int <> (q ->> 'a')::int) then
      insert into public.student_mistakes (student_id, topic, item, correction)
      select new.student_id, 'challenge', jsonb_build_object('q', q -> 'q', 'o', q -> 'o', 'a', q -> 'a')::text, q -> 'o' ->> ((q ->> 'a')::int)
      where not exists (select 1 from public.student_mistakes m where m.student_id = new.student_id and m.topic = 'challenge'
                          and m.item = jsonb_build_object('q', q -> 'q', 'o', q -> 'o', 'a', q -> 'a')::text and not m.is_resolved);
    elsif q ? 'mistake_id' then
      update public.student_mistakes set is_resolved = true where id = (q ->> 'mistake_id')::uuid and student_id = new.student_id;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists trg_challenge_mistakes on public.daily_challenges;
create trigger trg_challenge_mistakes after insert on public.daily_challenges for each row execute function private.challenge_mistakes();

-- O'quvchi o'z xatosini "o'rgandim" deb belgilashi
create or replace function public.resolve_mistake(p_id uuid) returns void
language sql security definer set search_path to 'public','pg_temp' as $$
  update public.student_mistakes set is_resolved = true where id = p_id and student_id = auth.uid();
$$;
grant execute on function public.resolve_mistake(uuid) to authenticated;

-- 2) Test turidagi uy vazifa: server baholaydi
create or replace function private.guard_submission() returns trigger
language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if coalesce(current_setting('northstar.trusted', true), '') = '1' then
    new.is_late := coalesce(new.submitted_at > (select due_at from public.assignments where id = new.assignment_id), false);
    new.updated_at := now(); return new;
  end if;
  if auth.uid() is not null and not private.is_staff() then
    if tg_op = 'UPDATE' then
      if old.status not in ('submitted','returned') then raise exception 'Submission is locked while it is being graded'; end if;
      if new.student_id <> old.student_id or new.assignment_id <> old.assignment_id then raise exception 'Cannot move a submission'; end if;
    end if;
    new.status := 'submitted'; new.submitted_at := now();
  end if;
  new.is_late := coalesce(new.submitted_at > (select due_at from public.assignments where id = new.assignment_id), false);
  new.updated_at := now(); return new;
end $$;

create or replace function public.submit_quiz(p_assignment uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare a public.assignments; n int; ok int := 0; i int; sc int; sid uuid; q jsonb; fb text; wrong text := '';
begin
  select * into a from public.assignments where id = p_assignment and type = 'quiz' and is_published
     and (target_group_id = any (private.my_group_ids()) or target_student_id = auth.uid());
  if not found then raise exception 'Test topilmadi'; end if;
  if not exists (select 1 from public.students where profile_id = auth.uid()) then raise exception 'Faqat o''quvchilar uchun'; end if;
  if exists (select 1 from public.submissions where assignment_id = p_assignment and student_id = auth.uid() and status = 'approved') then raise exception 'Test allaqachon topshirilgan'; end if;
  n := jsonb_array_length(a.quiz);
  for i in 0 .. n - 1 loop
    q := a.quiz -> i;
    if (p_answers ->> i) is not null and (p_answers ->> i)::int = (q ->> 'a')::int then ok := ok + 1;
    else
      wrong := wrong || chr(10) || '• ' || (q ->> 'q') || ' → ' || (q -> 'o' ->> ((q ->> 'a')::int));
      insert into public.student_mistakes (student_id, topic, item, correction)
      values (auth.uid(), 'challenge', jsonb_build_object('q', q -> 'q', 'o', q -> 'o', 'a', q -> 'a')::text, q -> 'o' ->> ((q ->> 'a')::int));
    end if;
  end loop;
  sc := case when n > 0 then round(ok * 100.0 / n) else 0 end;
  fb := ok || '/' || n || ' correct.' || case when wrong <> '' then ' Review:' || wrong else ' Excellent work!' end;
  perform set_config('northstar.trusted', '1', true);
  insert into public.submissions (assignment_id, student_id, quiz_answers, status, submitted_at)
  values (p_assignment, auth.uid(), p_answers, 'approved', now())
  on conflict do nothing returning id into sid;
  if sid is null then
    select id into sid from public.submissions where assignment_id = p_assignment and student_id = auth.uid();
    update public.submissions set quiz_answers = p_answers, status = 'approved', submitted_at = now() where id = sid;
  end if;
  insert into public.submission_grades (submission_id, final_score, final_feedback, approved_at)
  values (sid, sc, fb, now())
  on conflict (submission_id) do update set final_score = excluded.final_score, final_feedback = excluded.final_feedback, approved_at = now();
  perform set_config('northstar.trusted', '', true);
  return jsonb_build_object('correct', ok, 'total', n, 'score', sc);
end $$;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;

-- 3) O'zbekcha xulosa (ota-ona uchun)
alter table public.submission_grades add column if not exists feedback_uz text;

-- 4) Fayl/ovoz: storage bucket + qoidalar (yo'l: <student_id>/<fayl>)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('submissions', 'submissions', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','audio/webm','audio/ogg','audio/mpeg','audio/mp4','application/pdf'])
on conflict (id) do nothing;
drop policy if exists ns_sub_insert on storage.objects;
create policy ns_sub_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists ns_sub_select on storage.objects;
create policy ns_sub_select on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or private.is_head_teacher()
    or private.teaches_student(((storage.foldername(name))[1])::uuid)
    or ((storage.foldername(name))[1])::uuid = any (private.visible_student_ids())));
drop policy if exists ns_sub_delete on storage.objects;
create policy ns_sub_delete on storage.objects for delete to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

-- 5) Mentor nishoni
insert into public.badges (code, name_uz, name_en, description, icon, bonus_points)
values ('mentor', 'Mentor', 'Mentor', 'Sinfdoshlariga yordam beradigan o''quvchi', '🌟', 3)
on conflict (code) do nothing;
create or replace function private.mentor_badge() returns trigger
language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if new.is_mentor and not coalesce(old.is_mentor, false) then perform private.award_badge(new.profile_id, 'mentor'); end if;
  return new;
end $$;
drop trigger if exists trg_mentor_badge on public.students;
create trigger trg_mentor_badge after update of is_mentor on public.students for each row execute function private.mentor_badge();

-- Guruhdagi mentorlar (o'quvchi va ota-ona ko'rishi uchun)
create or replace function public.group_mentors(p_group uuid) returns table(student_id uuid, full_name text)
language sql stable security definer set search_path to 'public','pg_temp' as $$
  select s.profile_id, p.full_name from public.students s join public.profiles p on p.id = s.profile_id
   where s.group_id = p_group and s.is_mentor and (p_group = any (private.my_group_ids()) or private.is_staff());
$$;
grant execute on function public.group_mentors(uuid) to authenticated;

-- 6) Sinflar musobaqasi (butun maktab bo'yicha o'rtacha ball)
create or replace function public.class_competition() returns table(class_id uuid, class_name text, students int, avg_score numeric, challenge_days int, rnk bigint)
language sql stable security definer set search_path to 'public','pg_temp' as $$
  with l as (select * from private.live_scores((select array_agg(id) from public.groups))),
  c as (
    select g.class_id, count(distinct l.student_id)::int st, round(avg(l.score), 1) av,
           (select count(*)::int from public.daily_challenges dc join public.students s2 on s2.profile_id = dc.student_id join public.groups g2 on g2.id = s2.group_id
             where g2.class_id = g.class_id and dc.challenge_date > (now() at time zone 'Asia/Tashkent')::date - 7) ch
      from l join public.groups g on g.id = l.group_id group by g.class_id)
  select c.class_id, cl.name, c.st, c.av, c.ch, rank() over (order by c.av desc)
    from c join public.classes cl on cl.id = c.class_id
   where auth.uid() is not null
   order by 6;
$$;
grant execute on function public.class_competition() to authenticated;

-- 7) Oylik hisobot (xodimlar uchun eksport)
create or replace function public.monthly_report(p_month date default null)
returns table(class_name text, group_name text, student text, login text, score numeric, streak int,
              hw_given int, hw_done int, hw_avg numeric, challenge_days int, sessions int, attended int, badges int)
language sql stable security definer set search_path to 'public','pg_temp' as $$
  with m as (select date_trunc('month', coalesce(p_month, (now() at time zone 'Asia/Tashkent')::date))::date m0),
  st as (select s.profile_id sid, s.group_id, g.class_id from public.students s join public.groups g on g.id = s.group_id
          where private.is_head_teacher() or private.teaches_group(s.group_id)),
  ls as (select * from private.live_scores((select array_agg(distinct group_id) from st)))
  select cl.name, g.name, p.full_name, p.login, ls.score, ls.streak,
    (select count(*)::int from public.assignments a, m where a.target_group_id = st.group_id and a.created_at >= m.m0 and a.created_at < m.m0 + interval '1 month'),
    (select count(*)::int from public.submissions su join public.assignments a on a.id = su.assignment_id, m where su.student_id = st.sid and a.created_at >= m.m0 and a.created_at < m.m0 + interval '1 month'),
    (select round(avg(gr.final_score), 1) from public.submissions su join public.submission_grades gr on gr.submission_id = su.id, m where su.student_id = st.sid and gr.approved_at >= m.m0 and gr.approved_at < m.m0 + interval '1 month'),
    (select count(*)::int from public.daily_challenges dc, m where dc.student_id = st.sid and dc.challenge_date >= m.m0 and dc.challenge_date < m.m0 + interval '1 month'),
    (select count(*)::int from public.live_sessions ss, m where ss.group_id = st.group_id and ss.starts_at >= m.m0 and ss.starts_at < m.m0 + interval '1 month' and ss.starts_at < now()),
    (select count(*)::int from public.attendance at join public.live_sessions ss on ss.id = at.session_id, m where at.student_id = st.sid and at.status <> 'absent' and ss.starts_at >= m.m0 and ss.starts_at < m.m0 + interval '1 month'),
    (select count(*)::int from public.student_badges sb, m where sb.student_id = st.sid and sb.awarded_at >= m.m0 and sb.awarded_at < m.m0 + interval '1 month')
  from st join public.profiles p on p.id = st.sid join public.groups g on g.id = st.group_id join public.classes cl on cl.id = st.class_id
  left join ls on ls.student_id = st.sid
  order by cl.name, g.name, ls.score desc nulls last;
$$;
grant execute on function public.monthly_report(date) to authenticated;
commit;
