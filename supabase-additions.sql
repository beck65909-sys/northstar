-- Applied after schema.sql (migrations 03–05). Already live in the Supabase project.

-- Students insert today's daily challenge; streak updates automatically.
create policy challenges_student_insert on public.daily_challenges for insert to authenticated
  with check (student_id = (select auth.uid()) and challenge_date = current_date);

create or replace function private.bump_streak() returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.streaks;
begin
  select * into s from public.streaks where student_id = new.student_id;
  if not found then
    insert into public.streaks (student_id, current_streak, longest_streak, last_completed_date) values (new.student_id, 1, 1, new.challenge_date);
  elsif s.last_completed_date = new.challenge_date then null;
  elsif s.last_completed_date = new.challenge_date - 1 then
    update public.streaks set current_streak = s.current_streak + 1, longest_streak = greatest(s.longest_streak, s.current_streak + 1), last_completed_date = new.challenge_date, updated_at = now() where student_id = new.student_id;
  else
    update public.streaks set current_streak = 1, last_completed_date = new.challenge_date, updated_at = now() where student_id = new.student_id;
  end if;
  return new;
end $$;
create trigger trg_challenge_streak after insert on public.daily_challenges for each row execute function private.bump_streak();

-- Current topic per group (drives the daily challenge and the parent "ask your child" questions).
alter table public.groups add column if not exists current_topic smallint not null default 0;

-- Live weekly score (last 7 days / 28 days of homework).
create or replace function private.live_scores(p_group_ids uuid[])
returns table(student_id uuid, full_name text, group_id uuid, class_id uuid, score numeric, streak int)
language sql stable security definer set search_path = public, pg_temp as $$
  with st as (
    select s.profile_id sid, p.full_name, s.group_id, g.class_id
      from students s join profiles p on p.id = s.profile_id join groups g on g.id = s.group_id
     where s.group_id = any (p_group_ids)),
  hw as (
    select st.sid, count(a.id) total,
           sum(case when sub.id is null then 0 when sub.is_late then 0.5 else 1 end) done,
           avg(gr.final_score) filter (where sub.status = 'approved') quality
      from st left join assignments a on a.target_group_id = st.group_id and a.is_published and a.created_at > now() - interval '28 days'
      left join submissions sub on sub.assignment_id = a.id and sub.student_id = st.sid
      left join submission_grades gr on gr.submission_id = sub.id
     group by st.sid),
  ch as (
    select dc.student_id sid, count(*) days, avg(dc.score) * 100.0 / 3 pct
      from daily_challenges dc where dc.challenge_date > current_date - 7 group by dc.student_id)
  select st.sid, st.full_name, st.group_id, st.class_id,
         least(100, round(
           coalesce(case when hw.total > 0 then hw.done / hw.total * 100 else 100 end, 100) * 0.30
         + coalesce(hw.quality, case when coalesce(hw.done,0) > 0 then 70 else 0 end) * 0.30
         + coalesce(ch.pct, 0) * 0.20
         + coalesce(ch.days, 0) / 7.0 * 100 * 0.20
         + case when coalesce(sk.current_streak,0) >= 30 then 5 when coalesce(sk.current_streak,0) >= 14 then 3 when coalesce(sk.current_streak,0) >= 7 then 2 else 0 end, 1)) score,
         case when sk.last_completed_date >= current_date - 1 then coalesce(sk.current_streak, 0) else 0 end
    from st left join hw on hw.sid = st.sid left join ch on ch.sid = st.sid left join streaks sk on sk.student_id = st.sid
$$;

create or replace function public.group_leaderboard(p_group_id uuid)
returns table(student_id uuid, full_name text, score numeric, streak int, rnk bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  select * from (
    select l.student_id, l.full_name, l.score, l.streak, rank() over (order by l.score desc) rnk
      from private.live_scores(array[p_group_id]) l) r
   where private.is_head_teacher() or private.teaches_group(p_group_id)
      or (p_group_id = any (private.my_group_ids()) and (r.rnk <= 3 or r.student_id = any (private.visible_student_ids())))
   order by r.rnk
$$;

create or replace function public.my_student_scores()
returns table(student_id uuid, full_name text, group_id uuid, class_id uuid, score numeric, streak int)
language sql stable security definer set search_path = public, pg_temp as $$
  select * from private.live_scores(
    case when private.is_head_teacher() then (select array_agg(id) from groups) else private.my_group_ids() end)
   where private.is_staff() or student_id = any (private.visible_student_ids())
$$;
revoke execute on function public.group_leaderboard(uuid), public.my_student_scores() from public, anon;
grant execute on function public.group_leaderboard(uuid), public.my_student_scores() to authenticated;
grant execute on function private.live_scores(uuid[]) to authenticated;

insert into public.levels (code, title, position) values ('A1','Beginner',1),('A2','Elementary',2),('B1','Intermediate',3) on conflict do nothing;

-- Feedback from the in-app "Fikr bildirish" button.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete set null,
  page text, body text not null check (length(body) between 2 and 4000),
  status text not null default 'new' check (status in ('new','done')),
  created_at timestamptz not null default now());
alter table public.feedback enable row level security;
create policy feedback_insert on public.feedback for insert to authenticated with check (author_id = (select auth.uid()));
create policy feedback_own on public.feedback for select to authenticated using (author_id = (select auth.uid()) or (select private.is_head_teacher()));
create policy feedback_head on public.feedback for update to authenticated using ((select private.is_head_teacher())) with check ((select private.is_head_teacher()));

-- Unit 1 template lessons (7) are seeded as head-teacher lessons with is_template = true.
