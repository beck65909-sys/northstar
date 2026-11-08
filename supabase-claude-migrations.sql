-- Daily Challenge: Toshkent sanasi (00:00-05:00 dagi xato tuzatildi)
alter policy challenges_student_insert on public.daily_challenges with check ((student_id = (select auth.uid())) and (challenge_date = (now() at time zone 'Asia/Tashkent')::date));
alter table public.daily_challenges alter column challenge_date set default ((now() at time zone 'Asia/Tashkent')::date);

-- Namuna darslar barcha foydalanuvchilarga o'qish uchun ochiq
create policy lessons_template_read on public.lessons for select to authenticated using (is_template);

-- pg_cron: har yakshanba 23:55 (Toshkent) haftalik reyting, oy oxiri Hall of Fame
-- select cron.schedule('northstar_weekly_scores', '55 18 * * 0', 'select private.save_weekly_scores()');

-- Northstar: Watching Time, nishonlar, Mystery Box, haftalik reyting + Hall of Fame (2026-11-09)
begin;

-- 1) Nishonlar
insert into public.badges (code, name_uz, name_en, description, icon, bonus_points) values
 ('streak_3',  '3 kunlik streak',   '3-day streak',    'Daily Challenge 3 kun ketma-ket',  '🔥', 1),
 ('streak_7',  'Bir hafta streak',  '7-day streak',    'Daily Challenge 7 kun ketma-ket',  '⚡', 2),
 ('streak_30', 'Bir oy streak',     '30-day streak',   'Daily Challenge 30 kun ketma-ket', '🏆', 5),
 ('perfect_challenge', 'Mukammal challenge', 'Perfect challenge', 'Challenge 3/3', '🎯', 1),
 ('homework_star', 'Uy vazifa yulduzi', 'Homework star', 'Uy vazifadan 90+ ball', '⭐', 2),
 ('watcher',   'Diqqatli tomoshabin', 'Attentive watcher', 'Watching Time 80%+', '🎬', 1),
 ('helper',    'Yordamchi',          'Helper',          'Sinfdoshlariga yordam berdi (o''qituvchi beradi)', '🤝', 2),
 ('speaker',   'Faol so''zlovchi',    'Active speaker',  'Darsda faol gapirdi (o''qituvchi beradi)', '🎤', 2)
on conflict (code) do nothing;

-- 2) Mystery Box sovg'alari
insert into public.mystery_box_rewards (title_uz, title_en, description, weight)
select * from (values
 ('+3 bonus ball', '+3 bonus points', 'Haftalik reytingga +3', 30),
 ('Streak muzlatgich', 'Streak freeze', '1 kun o''tkazib yuborsangiz streak saqlanadi', 20),
 ('Uy vazifadan ozod', 'Homework pass', '1 ta uy vazifani keyinroq topshirish huquqi', 10),
 ('Sinf DJ', 'Class DJ', 'Tanaffusda musiqa tanlash', 15),
 ('Oltin yulduzcha', 'Golden star', 'Profil uchun oltin yulduz', 15),
 ('O''qituvchi bilan selfi', 'Selfie with teacher', 'Dars oxirida', 10)
) v(a,b,c,d) where not exists (select 1 from public.mystery_box_rewards);

-- 3) Avtomatik nishonlar
create or replace function private.award_badge(p_student uuid, p_code text) returns void
language sql security definer set search_path to 'public','pg_temp' as $$
  insert into public.student_badges (student_id, badge_id)
  select p_student, b.id from public.badges b
   where b.code = p_code and not exists (select 1 from public.student_badges sb where sb.student_id = p_student and sb.badge_id = b.id);
$$;

create or replace function private.challenge_badges() returns trigger
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare k int;
begin
  select current_streak into k from public.streaks where student_id = new.student_id;
  if k >= 3 then perform private.award_badge(new.student_id, 'streak_3'); end if;
  if k >= 7 then perform private.award_badge(new.student_id, 'streak_7'); end if;
  if k >= 30 then perform private.award_badge(new.student_id, 'streak_30'); end if;
  if new.score = 3 then perform private.award_badge(new.student_id, 'perfect_challenge'); end if;
  return new;
end $$;
drop trigger if exists trg_challenge_zbadges on public.daily_challenges;
create trigger trg_challenge_zbadges after insert on public.daily_challenges for each row execute function private.challenge_badges();

create or replace function private.grade_badges() returns trigger
language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if new.final_score >= 90 and new.approved_at is not null then
    perform private.award_badge((select student_id from public.submissions where id = new.submission_id), 'homework_star');
  end if;
  return new;
end $$;
drop trigger if exists trg_grade_badges on public.submission_grades;
create trigger trg_grade_badges after insert or update of final_score, approved_at on public.submission_grades for each row execute function private.grade_badges();

-- 4) Watching Time: o'quvchi javob yuboradi, server baholaydi
create or replace function public.submit_watching(p_id uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare w public.watching_time; n int; ok int := 0; pct numeric; bonus smallint; i int;
begin
  if not exists (select 1 from public.students where profile_id = auth.uid()) then raise exception 'Faqat o''quvchilar uchun'; end if;
  select * into w from public.watching_time where id = p_id and (class_id is null or class_id = any (private.my_class_ids()));
  if not found then raise exception 'Video topilmadi'; end if;
  if exists (select 1 from public.watching_time_results where watching_time_id = p_id and student_id = auth.uid()) then raise exception 'Siz bu videoga javob bergansiz'; end if;
  n := jsonb_array_length(w.questions);
  for i in 0 .. n - 1 loop
    if (p_answers ->> i) is not null and (p_answers ->> i)::int = (w.questions -> i ->> 'a')::int then ok := ok + 1; end if;
  end loop;
  pct := case when n > 0 then round(ok * 100.0 / n, 1) else 0 end;
  bonus := case when pct >= 80 then 3 when pct >= 50 then 1 else 0 end;
  insert into public.watching_time_results (watching_time_id, student_id, answers, score_percent) values (p_id, auth.uid(), p_answers, pct) returning bonus_points into bonus;
  if pct >= 80 then perform private.award_badge(auth.uid(), 'watcher'); end if;
  return jsonb_build_object('correct', ok, 'total', n, 'percent', pct, 'bonus', bonus);
end $$;
grant execute on function public.submit_watching(uuid, jsonb) to authenticated;

-- 5) Mystery Box: 7+ kunlik streak bo'lsa, haftada 1 marta
create or replace function public.open_mystery_box() returns jsonb
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare k int; r public.mystery_box_rewards; tot int; pick int;
begin
  select current_streak into k from public.streaks where student_id = auth.uid()
     and last_completed_date >= (now() at time zone 'Asia/Tashkent')::date - 1;
  if coalesce(k, 0) < 7 then raise exception 'Mystery Box 7 kunlik streakdan keyin ochiladi'; end if;
  if exists (select 1 from public.mystery_box_openings where student_id = auth.uid() and opened_at > now() - interval '7 days') then
    raise exception 'Bu hafta quti ochilgan. Keyingi hafta yana!'; end if;
  select sum(weight) into tot from public.mystery_box_rewards where is_active;
  pick := floor(random() * tot)::int;
  for r in select * from public.mystery_box_rewards where is_active order by id loop
    pick := pick - r.weight; exit when pick < 0;
  end loop;
  insert into public.mystery_box_openings (student_id, reward_id, reason) values (auth.uid(), r.id, k || ' kunlik streak');
  return jsonb_build_object('title', r.title_uz, 'description', r.description);
end $$;
grant execute on function public.open_mystery_box() to authenticated;

-- O'qituvchi sovg'ani "berildi" deb belgilay olsin
drop policy if exists mystery_openings_teacher_update on public.mystery_box_openings;
create policy mystery_openings_teacher_update on public.mystery_box_openings for update using (private.teaches_student(student_id)) with check (private.teaches_student(student_id));

-- 6) Haftalik reytingni saqlash (har yakshanba 23:55 Toshkent) + oylik Hall of Fame
create or replace function private.save_weekly_scores(p_week date default null) returns int
language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare wk date := coalesce(p_week, date_trunc('week', now() at time zone 'Asia/Tashkent')::date); n int;
begin
  insert into public.weekly_scores (student_id, group_id, week_start, base_score, streak_bonus, badge_bonus, watching_bonus, computed_at)
  select l.student_id, l.group_id, wk, l.score, 0,
         coalesce((select sum(b.bonus_points) from public.student_badges sb join public.badges b on b.id = sb.badge_id
                    where sb.student_id = l.student_id and sb.awarded_at >= wk and sb.awarded_at < wk + 7), 0),
         coalesce((select sum(r.bonus_points) from public.watching_time_results r
                    where r.student_id = l.student_id and r.completed_at >= wk and r.completed_at < wk + 7), 0),
         now()
    from private.live_scores((select array_agg(id) from public.groups)) l
  on conflict (student_id, week_start) do update set group_id = excluded.group_id, base_score = excluded.base_score,
         badge_bonus = excluded.badge_bonus, watching_bonus = excluded.watching_bonus, computed_at = now();
  get diagnostics n = row_count; return n;
end $$;

create or replace function private.save_hall_of_fame(p_month date default null) returns void
language sql security definer set search_path to 'public','pg_temp' as $$
  insert into public.hall_of_fame (month, class_id, student_id, rank, score)
  select m, class_id, student_id, rk, avg_score from (
    select date_trunc('month', coalesce(p_month, (now() at time zone 'Asia/Tashkent')::date))::date m, g.class_id, ws.student_id,
           round(avg(ws.total_score), 1) avg_score,
           row_number() over (partition by g.class_id order by avg(ws.total_score) desc) rk
      from public.weekly_scores ws join public.groups g on g.id = ws.group_id
     where date_trunc('month', ws.week_start) = date_trunc('month', coalesce(p_month, (now() at time zone 'Asia/Tashkent')::date))
     group by g.class_id, ws.student_id) t
  where rk <= 3
  on conflict (month, class_id, rank) do update set student_id = excluded.student_id, score = excluded.score;
$$;

-- Head teacher qo'lda ham saqlay olsin
create or replace function public.save_week_now() returns int
language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if not private.is_staff() then raise exception 'Faqat xodimlar'; end if;
  return private.save_weekly_scores();
end $$;
grant execute on function public.save_week_now() to authenticated;

commit;
