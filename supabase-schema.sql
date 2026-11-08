-- =============================================================================
-- NORTHSTAR — school English-learning platform
-- Supabase (Postgres 15+) schema: tables, enums, helpers, views, RLS
-- =============================================================================
--
-- AUTH NOTES
--   * Every user is a row in auth.users + one row in public.profiles (same id).
--   * Students and teachers sign in with LOGIN + PASSWORD. Supabase Auth needs
--     an email, so the app maps a login to a synthetic email:
--         email = lower(login) || '@northstar.local'
--     The UI only ever shows "login". Parents may use the same scheme or a
--     real email/phone.
--   * Public sign-up must be DISABLED in the Supabase dashboard. Accounts are
--     created by an Edge Function (service_role, auth.admin.createUser) that
--     first checks the caller: head_teacher -> any account; teacher -> only
--     students in groups of classes they teach. The same function inserts the
--     profiles + students rows. There is deliberately NO trigger on
--     auth.users that trusts user-supplied metadata for the role.
--   * Both head teacher and teachers can create students. Teachers' UI simply
--     never mentions that the head teacher can do it too (no DB concern).
--
-- WRITE PATHS
--   * service_role (Edge Functions / cron) bypasses RLS. It is used for:
--     AI checking, quiz auto-scoring, daily challenges, streaks, weekly
--     scores, watching-time results, hall of fame, mystery boxes.
--   * Clients (anon key + user JWT) are restricted by the RLS below.
--
-- STORAGE (create in dashboard / separate migration)
--   buckets: avatars, lesson-materials, submissions
--   submissions path convention: {student_id}/{assignment_id}/{file}
--   Columns below store storage *paths*, not signed URLs.
-- =============================================================================

create extension if not exists pgcrypto;

-- Helpers live in a schema that PostgREST does NOT expose.
create schema if not exists private;

-- =============================================================================
-- 1. ENUMS
-- =============================================================================
create type public.user_role            as enum ('head_teacher', 'teacher', 'student', 'parent');
create type public.ui_language          as enum ('uz', 'en');
create type public.section_type         as enum ('warm_up', 'vocabulary', 'grammar', 'reading',
                                                 'listening', 'speaking', 'writing', 'quiz');
create type public.material_type        as enum ('text', 'image', 'video', 'audio', 'pdf', 'link');
create type public.attendance_status    as enum ('present', 'absent', 'late');
create type public.assignment_type      as enum ('written', 'file', 'voice', 'quiz');
create type public.submission_status    as enum ('submitted', 'ai_checked', 'approved', 'returned');
create type public.announcement_audience as enum ('school', 'teachers', 'parents', 'group', 'class');

-- =============================================================================
-- 2. PEOPLE & SCHOOL STRUCTURE
--    head teacher -> teachers -> classes -> groups -> students
-- =============================================================================

-- One row per auth user.
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  role             public.user_role   not null,
  login            text unique
                   check (login ~ '^[a-z0-9._-]{3,32}$'),   -- email = login@northstar.local
  full_name        text               not null,
  language         public.ui_language not null default 'uz',
  avatar_url       text,                                     -- storage path in "avatars"
  head_teacher_id  uuid references public.profiles (id) on delete set null,  -- teachers only
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint head_teacher_only_for_teachers
    check (head_teacher_id is null or role = 'teacher')
);
create index on public.profiles (role);
create index on public.profiles (head_teacher_id);

create table public.levels (                      -- A1, A2, B1, B2, ...
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,               -- 'A1'
  title       text not null,
  position    int  not null default 0
);

create table public.classes (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,                   -- e.g. '7-B'
  level_id       uuid references public.levels (id) on delete set null,
  academic_year  text,                            -- e.g. '2026-2027'
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index on public.classes (level_id);

-- A class has 1 OR 2 teachers (enforced by trigger below).
create table public.class_teachers (
  class_id    uuid not null references public.classes (id)  on delete cascade,
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  is_primary  boolean not null default true,
  assigned_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);
create index on public.class_teachers (teacher_id);

create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (class_id, name)
);
create index on public.groups (class_id);

-- Student extension of profiles. PK = profile id => exactly ONE group per student.
create table public.students (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  group_id    uuid not null references public.groups (id) on delete restrict,
  is_mentor   boolean not null default false,     -- peer mentor flag
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.students (group_id);

-- Parent <-> child (a parent may have several children, a child several parents).
create table public.parent_students (
  parent_id   uuid not null references public.profiles (id) on delete cascade,
  student_id  uuid not null references public.students (profile_id) on delete cascade,
  relation    text,                               -- 'mother', 'father', ...
  primary key (parent_id, student_id)
);
create index on public.parent_students (student_id);

-- =============================================================================
-- 3. LESSON LIBRARY  levels -> units -> lessons -> lesson_sections
-- =============================================================================
create table public.units (
  id          uuid primary key default gen_random_uuid(),
  level_id    uuid not null references public.levels (id) on delete cascade,
  title       text not null,
  position    int  not null default 0,
  owner_id    uuid references public.profiles (id) on delete set null  -- null = shared/official
);
create index on public.units (level_id);

create table public.lessons (
  id                 uuid primary key default gen_random_uuid(),
  unit_id            uuid references public.units (id) on delete set null,
  owner_id           uuid not null references public.profiles (id) on delete cascade,
  title              text not null,
  objective          text,
  position           int  not null default 0,
  -- Head-teacher lessons with is_template = true are visible to all teachers,
  -- who COPY them (public.copy_lesson) instead of editing them.
  is_template        boolean not null default false,
  copied_from        uuid references public.lessons (id) on delete set null,
  -- Parent view: short "what we learned today" summary.
  parent_summary_uz  text,
  parent_summary_en  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on public.lessons (owner_id);
create index on public.lessons (unit_id);
create index on public.lessons (copied_from);
create index on public.lessons (is_template) where is_template;

create table public.lesson_sections (
  id                uuid primary key default gen_random_uuid(),
  lesson_id         uuid not null references public.lessons (id) on delete cascade,
  section_type      public.section_type not null,
  title             text,
  content           jsonb not null default '{}'::jsonb,   -- rich content / quiz items
  duration_minutes  int check (duration_minutes between 1 and 180),
  position          int not null default 0
);
create index on public.lesson_sections (lesson_id, position);

create table public.lesson_materials (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  section_id    uuid references public.lesson_sections (id) on delete cascade,
  material_type public.material_type not null,
  title         text,
  body          text,                -- for material_type = 'text'
  url           text,                -- external link / YouTube
  storage_path  text,                -- file in "lesson-materials" bucket
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  check (body is not null or url is not null or storage_path is not null)
);
create index on public.lesson_materials (lesson_id);
create index on public.lesson_materials (section_id);

-- 2–3 auto-generated "ask your child" questions per lesson (parent view).
create table public.lesson_parent_questions (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  position     smallint not null check (position between 1 and 3),
  question_uz  text not null,
  question_en  text,
  expected_answer text,              -- hint for the parent
  created_by_ai boolean not null default true,
  unique (lesson_id, position)
);

-- =============================================================================
-- 4. LIVE LESSONS, ATTENDANCE, TEACHER TRAININGS, OBSERVATIONS
-- =============================================================================
create table public.live_sessions (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references public.groups (id) on delete cascade,
  teacher_id       uuid not null references public.profiles (id) on delete cascade,
  lesson_id        uuid references public.lessons (id) on delete set null,  -- drives parent digest
  starts_at        timestamptz not null,
  duration_minutes int not null default 45,
  google_meet_url  text check (google_meet_url is null or google_meet_url like 'https://meet.google.com/%'),
  created_at       timestamptz not null default now()
);
create index on public.live_sessions (group_id, starts_at);
create index on public.live_sessions (teacher_id, starts_at);
create index on public.live_sessions (lesson_id);

create table public.attendance (
  session_id  uuid not null references public.live_sessions (id) on delete cascade,
  student_id  uuid not null references public.students (profile_id) on delete cascade,
  status      public.attendance_status not null,
  marked_by   uuid references public.profiles (id) on delete set null,
  marked_at   timestamptz not null default now(),
  primary key (session_id, student_id)
);
create index on public.attendance (student_id);

create table public.trainings (                    -- head teacher -> teachers
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  starts_at        timestamptz not null,
  google_meet_url  text,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index on public.trainings (starts_at);

create table public.training_attendance (
  training_id uuid not null references public.trainings (id) on delete cascade,
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  status      public.attendance_status not null,
  note        text,
  primary key (training_id, teacher_id)
);
create index on public.training_attendance (teacher_id);

create table public.observations (                 -- lesson observations by head teacher
  id                       uuid primary key default gen_random_uuid(),
  teacher_id               uuid not null references public.profiles (id) on delete cascade,
  observer_id              uuid references public.profiles (id) on delete set null,
  session_id               uuid references public.live_sessions (id) on delete set null,
  observed_on              date not null default current_date,
  goal_clarity             smallint not null check (goal_clarity between 1 and 5),
  talk_time_ratio          smallint not null check (talk_time_ratio between 1 and 5),
  student_engagement       smallint not null check (student_engagement between 1 and 5),
  feedback_quality         smallint not null check (feedback_quality between 1 and 5),
  time_management          smallint not null check (time_management between 1 and 5),
  average_score            numeric(3,2) generated always as
                           ((goal_clarity + talk_time_ratio + student_engagement
                             + feedback_quality + time_management) / 5.0) stored,
  comment                  text,
  next_step                text,
  created_at               timestamptz not null default now()
);
create index on public.observations (teacher_id, observed_on desc);

-- =============================================================================
-- 5. HOMEWORK, GRADING, MISTAKES BANK
-- =============================================================================
create table public.assignments (
  id                 uuid primary key default gen_random_uuid(),
  lesson_id          uuid references public.lessons (id) on delete set null,
  type               public.assignment_type not null,
  title              text not null,
  instructions       text,                       -- always written in English
  quiz               jsonb,                      -- questions + answer key for type = 'quiz'
  target_group_id    uuid references public.groups (id) on delete cascade,
  target_student_id  uuid references public.students (profile_id) on delete cascade,
  due_at             timestamptz,
  max_score          smallint not null default 100 check (max_score between 1 and 100),
  created_by_ai      boolean not null default false,
  is_published       boolean not null default true,   -- AI drafts start unpublished
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  -- exactly one target: a whole group OR a single student
  constraint one_target check (num_nonnulls(target_group_id, target_student_id) = 1),
  constraint quiz_has_items check (type <> 'quiz' or quiz is not null)
);
create index on public.assignments (target_group_id, due_at);
create index on public.assignments (target_student_id, due_at);
create index on public.assignments (created_by);

-- What the student hands in. Students can see/edit their own row (status only
-- moves to 'submitted'); scores live in submission_grades (see below).
create table public.submissions (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.assignments (id) on delete cascade,
  student_id      uuid not null references public.students (profile_id) on delete cascade,
  text_answer     text,
  file_paths      text[] not null default '{}',   -- "submissions" bucket
  voice_path      text,                           -- "submissions" bucket
  quiz_answers    jsonb,
  submitted_at    timestamptz not null default now(),
  is_late         boolean not null default false, -- set by trigger from assignments.due_at
  status          public.submission_status not null default 'submitted',
  updated_at      timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index on public.submissions (student_id);
create index on public.submissions (status);

-- Grading on a 100-point scale. Kept in a separate table so RLS can hide the
-- AI draft and unapproved scores from students/parents:
--   * quiz      -> auto-scored by Edge Function, status set straight to 'approved'
--   * written / voice / file -> AI draft (ai_score, ai_feedback) -> teacher
--     sets final_score/final_feedback and status 'approved' (or 'returned').
-- Students/parents can read a grade row ONLY when the submission is 'approved'.
create table public.submission_grades (
  submission_id   uuid primary key references public.submissions (id) on delete cascade,
  ai_score        smallint check (ai_score between 0 and 100),
  ai_feedback     text,                           -- draft, teacher-only
  final_score     smallint check (final_score between 0 and 100),
  final_feedback  text,
  graded_by       uuid references public.profiles (id) on delete set null,
  ai_checked_at   timestamptz,
  approved_at     timestamptz,
  updated_at      timestamptz not null default now()
);

create table public.student_mistakes (             -- mistakes bank
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid not null references public.students (profile_id) on delete cascade,
  topic                 text not null,              -- e.g. 'Present Simple: 3rd person -s'
  item                  text not null,              -- the wrong form
  correction            text,
  source_submission_id  uuid references public.submissions (id) on delete set null,
  is_resolved           boolean not null default false,
  created_at            timestamptz not null default now()
);
create index on public.student_mistakes (student_id, topic);
create index on public.student_mistakes (source_submission_id);

-- =============================================================================
-- 6. ANNOUNCEMENTS
-- =============================================================================
create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles (id) on delete set null,
  audience    public.announcement_audience not null,
  target_id   uuid,              -- class id or group id when audience in ('class','group')
  title       text not null,
  body        text not null,
  created_at  timestamptz not null default now(),
  constraint target_matches_audience check (
    (audience in ('class', 'group') and target_id is not null) or
    (audience in ('school', 'teachers', 'parents') and target_id is null))
);
create index on public.announcements (audience, target_id, created_at desc);

-- =============================================================================
-- 7. GAMIFICATION
-- =============================================================================

-- 1 challenge per student per day, 3 questions.
create table public.daily_challenges (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students (profile_id) on delete cascade,
  challenge_date  date not null default current_date,
  questions       jsonb not null check (jsonb_typeof(questions) = 'array'
                                        and jsonb_array_length(questions) = 3),
  answers         jsonb,
  score           smallint check (score between 0 and 3),
  completed_at    timestamptz,
  unique (student_id, challenge_date)
);

create table public.streaks (
  student_id           uuid primary key references public.students (profile_id) on delete cascade,
  current_streak       int  not null default 0 check (current_streak >= 0),
  longest_streak       int  not null default 0 check (longest_streak >= 0),
  last_completed_date  date,
  freezes_available    smallint not null default 1 check (freezes_available between 0 and 1), -- 1 per week
  freeze_week_start    date,         -- ISO week the freeze counter belongs to
  updated_at           timestamptz not null default now()
);

create table public.badges (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name_uz       text not null,
  name_en       text not null,
  description   text,
  icon          text,
  bonus_points  smallint not null default 1       -- +1 to weekly score
);

create table public.student_badges (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students (profile_id) on delete cascade,
  badge_id    uuid not null references public.badges (id) on delete cascade,
  awarded_by  uuid references public.profiles (id) on delete set null,  -- null = system
  awarded_at  timestamptz not null default now()
);
create index on public.student_badges (student_id, awarded_at desc);

-- Weekly video ("Watching Time"). class_id null = whole school.
create table public.watching_time (
  id                 uuid primary key default gen_random_uuid(),
  week_start         date not null check (extract(isodow from week_start) = 1),
  class_id           uuid references public.classes (id) on delete cascade,
  title              text not null,
  youtube_embed_url  text not null check (youtube_embed_url like 'https://www.youtube.com/embed/%'
                                          or youtube_embed_url like 'https://www.youtube-nocookie.com/embed/%'),
  questions          jsonb not null check (jsonb_typeof(questions) = 'array'),
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index on public.watching_time (week_start, class_id);

create table public.watching_time_results (
  watching_time_id  uuid not null references public.watching_time (id) on delete cascade,
  student_id        uuid not null references public.students (profile_id) on delete cascade,
  answers           jsonb,
  score_percent     numeric(5,2) not null check (score_percent between 0 and 100),
  bonus_points      smallint generated always as (case when score_percent > 60 then 3 else 0 end) stored,
  completed_at      timestamptz not null default now(),
  primary key (watching_time_id, student_id)
);
create index on public.watching_time_results (student_id);

-- Weekly score per student. Category columns are 0–100 percentages; base_score
-- is the weighted sum computed by the scoring job using settings.score_weights
-- (homework_completion 25, homework_quality 25, weekly_test 15, attendance 15,
-- activity 10, growth 10). Bonuses added on top, total capped at 100.
create table public.weekly_scores (
  id                       uuid primary key default gen_random_uuid(),
  student_id               uuid not null references public.students (profile_id) on delete cascade,
  group_id                 uuid not null references public.groups (id) on delete cascade, -- snapshot
  week_start               date not null check (extract(isodow from week_start) = 1),   -- Monday
  homework_completion_pct  numeric(5,2) not null default 0 check (homework_completion_pct between 0 and 100),
  homework_quality_pct     numeric(5,2) not null default 0 check (homework_quality_pct    between 0 and 100),
  weekly_test_pct          numeric(5,2) not null default 0 check (weekly_test_pct         between 0 and 100),
  attendance_pct           numeric(5,2) not null default 0 check (attendance_pct          between 0 and 100),
  activity_pct             numeric(5,2) not null default 0 check (activity_pct            between 0 and 100),
  growth_pct               numeric(5,2) not null default 0 check (growth_pct              between 0 and 100),
  base_score               numeric(5,2) not null default 0 check (base_score between 0 and 100),
  streak_bonus             smallint not null default 0 check (streak_bonus in (0, 2, 3, 5)), -- 7d/14d/30d (highest tier)
  badge_bonus              smallint not null default 0 check (badge_bonus >= 0),             -- +1 per badge
  watching_bonus           smallint not null default 0 check (watching_bonus in (0, 3)),     -- >60%
  total_score              numeric(5,2) generated always as
                           (least(100, base_score + streak_bonus + badge_bonus + watching_bonus)) stored,
  computed_at              timestamptz not null default now(),
  unique (student_id, week_start)
);
create index on public.weekly_scores (group_id, week_start, total_score desc);

create table public.hall_of_fame (
  id          uuid primary key default gen_random_uuid(),
  month       date not null check (extract(day from month) = 1),  -- first day of month
  class_id    uuid references public.classes (id) on delete cascade, -- null = school-wide
  student_id  uuid not null references public.students (profile_id) on delete cascade,
  rank        smallint not null check (rank between 1 and 10),
  score       numeric(5,2),
  unique nulls not distinct (month, class_id, rank)
);
create index on public.hall_of_fame (student_id);

create table public.mystery_box_rewards (           -- reward catalog
  id          uuid primary key default gen_random_uuid(),
  title_uz    text not null,
  title_en    text not null,
  description text,
  weight      int not null default 1 check (weight > 0),   -- draw probability weight
  is_active   boolean not null default true
);

create table public.mystery_box_openings (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students (profile_id) on delete cascade,
  reward_id   uuid references public.mystery_box_rewards (id) on delete set null,
  reason      text,                                 -- e.g. 'streak_30', 'top3_week'
  opened_at   timestamptz not null default now(),
  is_claimed  boolean not null default false
);
create index on public.mystery_box_openings (student_id);

-- =============================================================================
-- 8. SETTINGS (key/value)
-- =============================================================================
create table public.settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

insert into public.settings (key, value, description) values
  ('score_weights',
   '{"homework_completion":25,"homework_quality":25,"weekly_test":15,"attendance":15,"activity":10,"growth":10}',
   'Weekly score category weights (%) — must sum to 100'),
  ('score_bonuses',
   '{"streak_7":2,"streak_14":3,"streak_30":5,"badge":1,"watching_time":3,"watching_time_threshold_pct":60,"cap":100}',
   'Bonus points added to the weekly score; total capped at "cap"'),
  ('watching_time_day', '"friday"',  'Weekday when the weekly video opens (adjust as agreed)'),
  ('ai_mode',           '"draft"',   'off | draft (AI drafts, teacher approves) | auto'),
  ('streak_freezes_per_week', '1',   'Streak freezes granted each ISO week');

-- =============================================================================
-- 9. HELPER FUNCTIONS (security definer => no RLS recursion)
--    All read auth.uid(); all live in the non-exposed "private" schema.
-- =============================================================================
create or replace function private.current_user_role()
returns public.user_role language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function private.is_head_teacher()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(private.current_user_role() = 'head_teacher', false)
$$;

create or replace function private.is_teacher()        -- plain teacher (not head)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(private.current_user_role() = 'teacher', false)
$$;

create or replace function private.is_staff()          -- head teacher or teacher
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(private.current_user_role() in ('head_teacher', 'teacher'), false)
$$;

create or replace function private.teaches_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.class_teachers
                 where class_id = p_class_id and teacher_id = auth.uid())
$$;

create or replace function private.teaches_group(p_group_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.groups g
                 join public.class_teachers ct on ct.class_id = g.class_id
                 where g.id = p_group_id and ct.teacher_id = auth.uid())
$$;

create or replace function private.teaches_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.students s
                 join public.groups g          on g.id = s.group_id
                 join public.class_teachers ct on ct.class_id = g.class_id
                 where s.profile_id = p_student_id and ct.teacher_id = auth.uid())
$$;

create or replace function private.is_parent_of(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.parent_students
                 where parent_id = auth.uid() and student_id = p_student_id)
$$;

-- Students the caller may see: self (student), children (parent), taught students (teacher).
create or replace function private.visible_student_ids()
returns uuid[] language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(array_agg(distinct sid), '{}') from (
    select s.profile_id as sid from public.students s where s.profile_id = auth.uid()
    union all
    select ps.student_id from public.parent_students ps where ps.parent_id = auth.uid()
    union all
    select s.profile_id from public.students s
      join public.groups g          on g.id = s.group_id
      join public.class_teachers ct on ct.class_id = g.class_id
     where ct.teacher_id = auth.uid()
  ) t
$$;

-- Groups the caller belongs to / has children in / teaches.
create or replace function private.my_group_ids()
returns uuid[] language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(array_agg(distinct gid), '{}') from (
    select s.group_id as gid from public.students s where s.profile_id = auth.uid()
    union all
    select s.group_id from public.parent_students ps
      join public.students s on s.profile_id = ps.student_id
     where ps.parent_id = auth.uid()
    union all
    select g.id from public.class_teachers ct
      join public.groups g on g.class_id = ct.class_id
     where ct.teacher_id = auth.uid()
  ) t
$$;

-- Classes the caller belongs to / has children in / teaches.
create or replace function private.my_class_ids()
returns uuid[] language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(array_agg(distinct cid), '{}') from (
    select g.class_id as cid from public.students s
      join public.groups g on g.id = s.group_id
     where s.profile_id = auth.uid()
    union all
    select g.class_id from public.parent_students ps
      join public.students s on s.profile_id = ps.student_id
      join public.groups g   on g.id = s.group_id
     where ps.parent_id = auth.uid()
    union all
    select ct.class_id from public.class_teachers ct where ct.teacher_id = auth.uid()
  ) t
$$;

-- Teachers whose lessons the caller may open:
--   student/parent -> the teacher(s) of their (child's) class
--   teacher        -> self + co-teachers of shared classes
create or replace function private.lesson_owner_ids()
returns uuid[] language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(array_agg(distinct tid), '{}') from (
    select auth.uid() as tid
    union all
    select ct.teacher_id from public.class_teachers ct
     where ct.class_id = any (private.my_class_ids())
  ) t
$$;

create or replace function private.can_view_profile(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select p_id = auth.uid()
      or private.is_head_teacher()
      or p_id = any (private.visible_student_ids())                -- students I teach / my kids
      or p_id = any (private.lesson_owner_ids())                   -- my (kid's) teachers, co-teachers
      or p_id = (select head_teacher_id from public.profiles where id = auth.uid())  -- my head
      or exists (select 1 from public.parent_students ps            -- parents of visible students
                 where ps.parent_id = p_id
                   and ps.student_id = any (private.visible_student_ids()))
$$;

create or replace function private.can_view_announcement(p_audience public.announcement_audience,
                                                          p_target uuid, p_author uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select private.is_head_teacher()
      or p_author = auth.uid()
      or p_audience = 'school'
      or (p_audience = 'teachers' and private.is_staff())
      or (p_audience = 'parents'  and private.current_user_role() = 'parent')
      or (p_audience = 'class'    and p_target = any (private.my_class_ids()))
      or (p_audience = 'group'    and p_target = any (private.my_group_ids()))
$$;

-- Execution rights: only signed-in users.
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;
revoke execute on all functions in schema private from public;
grant execute on all functions in schema private to authenticated, service_role;

-- =============================================================================
-- 10. TRIGGERS (integrity rules RLS cannot express)
-- =============================================================================

-- updated_at
create or replace function private.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger trg_profiles_updated   before update on public.profiles          for each row execute function private.set_updated_at();
create trigger trg_lessons_updated    before update on public.lessons           for each row execute function private.set_updated_at();
create trigger trg_grades_updated     before update on public.submission_grades for each row execute function private.set_updated_at();
create trigger trg_settings_updated   before update on public.settings          for each row execute function private.set_updated_at();

-- Generic role check: TG_ARGV[0] = column holding a profile id, rest = allowed roles.
create or replace function private.assert_profile_role()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id   uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
  v_role public.user_role;
begin
  if v_id is null then return new; end if;
  select role into v_role from public.profiles where id = v_id;
  if v_role is null or not (v_role::text = any (tg_argv[1:])) then
    raise exception '%.% must reference a profile with role %', tg_table_name, tg_argv[0], tg_argv[1:];
  end if;
  return new;
end $$;

create trigger trg_students_role        before insert or update on public.students
  for each row execute function private.assert_profile_role('profile_id', 'student');
create trigger trg_parent_role          before insert or update on public.parent_students
  for each row execute function private.assert_profile_role('parent_id', 'parent');
create trigger trg_class_teacher_role   before insert or update on public.class_teachers
  for each row execute function private.assert_profile_role('teacher_id', 'teacher', 'head_teacher');
create trigger trg_profile_head_role    before insert or update of head_teacher_id on public.profiles
  for each row execute function private.assert_profile_role('head_teacher_id', 'head_teacher');
create trigger trg_session_teacher_role before insert or update on public.live_sessions
  for each row execute function private.assert_profile_role('teacher_id', 'teacher', 'head_teacher');
create trigger trg_obs_teacher_role     before insert or update on public.observations
  for each row execute function private.assert_profile_role('teacher_id', 'teacher');
create trigger trg_training_att_role    before insert or update on public.training_attendance
  for each row execute function private.assert_profile_role('teacher_id', 'teacher');

-- A class has at most 2 teachers.
create or replace function private.limit_class_teachers()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if (select count(*) from public.class_teachers
       where class_id = new.class_id and teacher_id <> new.teacher_id) >= 2 then
    raise exception 'A class can have at most 2 teachers';
  end if;
  return new;
end $$;
create trigger trg_class_teachers_limit before insert or update on public.class_teachers
  for each row execute function private.limit_class_teachers();

-- Only the head teacher (or service_role) may change role / login / head_teacher_id.
create or replace function private.guard_profile()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or private.is_head_teacher() then return new; end if;
  if new.role is distinct from old.role
     or new.login is distinct from old.login
     or new.head_teacher_id is distinct from old.head_teacher_id then
    raise exception 'Only the head teacher can change role, login or head teacher';
  end if;
  return new;
end $$;
create trigger trg_profiles_guard before update on public.profiles
  for each row execute function private.guard_profile();

-- Only head-teacher lessons can be templates.
create or replace function private.guard_template()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.is_template and (select role from public.profiles where id = new.owner_id) <> 'head_teacher' then
    raise exception 'Only head teacher lessons can be templates';
  end if;
  return new;
end $$;
create trigger trg_lessons_template before insert or update on public.lessons
  for each row execute function private.guard_template();

-- Submissions: students can only (re)submit; is_late derived from due_at.
create or replace function private.guard_submission()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is not null and not private.is_staff() then          -- student path
    if tg_op = 'UPDATE' then
      if old.status not in ('submitted', 'returned') then
        raise exception 'Submission is locked while it is being graded';
      end if;
      if new.student_id <> old.student_id or new.assignment_id <> old.assignment_id then
        raise exception 'Cannot move a submission';
      end if;
    end if;
    new.status       := 'submitted';
    new.submitted_at := now();
  end if;

  new.is_late    := coalesce(new.submitted_at > (select due_at from public.assignments
                                                  where id = new.assignment_id), false);
  new.updated_at := now();
  return new;
end $$;
create trigger trg_submissions_guard before insert or update on public.submissions
  for each row execute function private.guard_submission();

-- =============================================================================
-- 11. RPC: copy a template (or own) lesson into the caller's library
-- =============================================================================
create or replace function public.copy_lesson(p_lesson_id uuid, p_unit_id uuid default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_src public.lessons;
  v_new uuid;
  v_sec public.lesson_sections;
  v_new_sec uuid;
begin
  if not private.is_staff() then raise exception 'Only teachers can copy lessons'; end if;

  select * into v_src from public.lessons where id = p_lesson_id;
  if not found or not (v_src.is_template or v_src.owner_id = auth.uid() or private.is_head_teacher()) then
    raise exception 'Lesson not found or not copyable';
  end if;

  insert into public.lessons (unit_id, owner_id, title, objective, position, is_template,
                              copied_from, parent_summary_uz, parent_summary_en)
  values (coalesce(p_unit_id, v_src.unit_id), auth.uid(), v_src.title, v_src.objective,
          v_src.position, false, v_src.id, v_src.parent_summary_uz, v_src.parent_summary_en)
  returning id into v_new;

  -- sections + their materials (materials reuse the same storage objects)
  for v_sec in select * from public.lesson_sections where lesson_id = v_src.id loop
    insert into public.lesson_sections (lesson_id, section_type, title, content, duration_minutes, position)
    values (v_new, v_sec.section_type, v_sec.title, v_sec.content, v_sec.duration_minutes, v_sec.position)
    returning id into v_new_sec;

    insert into public.lesson_materials (lesson_id, section_id, material_type, title, body,
                                         url, storage_path, position)
    select v_new, v_new_sec, material_type, title, body, url, storage_path, position
      from public.lesson_materials where section_id = v_sec.id;
  end loop;

  -- lesson-level materials (no section)
  insert into public.lesson_materials (lesson_id, section_id, material_type, title, body,
                                       url, storage_path, position)
  select v_new, null, material_type, title, body, url, storage_path, position
    from public.lesson_materials where lesson_id = v_src.id and section_id is null;

  insert into public.lesson_parent_questions (lesson_id, position, question_uz, question_en,
                                              expected_answer, created_by_ai)
  select v_new, position, question_uz, question_en, expected_answer, created_by_ai
    from public.lesson_parent_questions where lesson_id = v_src.id;

  return v_new;
end $$;
revoke execute on function public.copy_lesson(uuid, uuid) from public, anon;
grant  execute on function public.copy_lesson(uuid, uuid) to authenticated;

-- =============================================================================
-- 12. ROW LEVEL SECURITY
--    Pattern: (select private.fn()) so Postgres evaluates helpers once per query.
--    Head teacher: full access everywhere.
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','levels','classes','class_teachers','groups','students','parent_students',
    'units','lessons','lesson_sections','lesson_materials','lesson_parent_questions',
    'live_sessions','attendance','trainings','training_attendance','observations',
    'assignments','submissions','submission_grades','student_mistakes','announcements',
    'daily_challenges','streaks','badges','student_badges','watching_time',
    'watching_time_results','weekly_scores','hall_of_fame','mystery_box_rewards',
    'mystery_box_openings','settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    -- head teacher: everything
    execute format('create policy head_all on public.%I for all to authenticated
                    using ((select private.is_head_teacher()))
                    with check ((select private.is_head_teacher()))', t);
  end loop;
end $$;

-- ---------- profiles -------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (private.can_view_profile(id));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));   -- guard trigger protects role/login
create policy profiles_update_teacher on public.profiles for update to authenticated
  using (private.teaches_student(id)) with check (private.teaches_student(id));  -- e.g. fix a student's name

-- ---------- reference data (readable by every signed-in user) -------------
create policy levels_read  on public.levels  for select to authenticated using (true);
create policy units_read   on public.units   for select to authenticated using (true);
create policy units_teacher_write on public.units for all to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_teacher()))
  with check (owner_id = (select auth.uid()) and (select private.is_teacher()));
create policy badges_read  on public.badges  for select to authenticated using (true);
create policy rewards_read on public.mystery_box_rewards for select to authenticated using (true);
create policy settings_read on public.settings for select to authenticated using (true);
create policy hof_read     on public.hall_of_fame for select to authenticated using (true);

-- ---------- classes / groups / membership ---------------------------------
create policy classes_select on public.classes for select to authenticated
  using (id = any ((select private.my_class_ids())::uuid[]));

create policy class_teachers_select on public.class_teachers for select to authenticated
  using (class_id = any ((select private.my_class_ids())::uuid[]));

create policy groups_select on public.groups for select to authenticated
  using (class_id = any ((select private.my_class_ids())::uuid[]));
create policy groups_teacher_write on public.groups for all to authenticated
  using (private.teaches_class(class_id)) with check (private.teaches_class(class_id));

create policy students_select on public.students for select to authenticated
  using (profile_id = any ((select private.visible_student_ids())::uuid[]));
-- Teachers create/move students only inside groups of their own classes.
create policy students_teacher_insert on public.students for insert to authenticated
  with check (private.teaches_group(group_id));
create policy students_teacher_update on public.students for update to authenticated
  using (private.teaches_student(profile_id)) with check (private.teaches_group(group_id));

create policy parent_students_select on public.parent_students for select to authenticated
  using (parent_id = (select auth.uid())
         or student_id = any ((select private.visible_student_ids())::uuid[]));
create policy parent_students_teacher_write on public.parent_students for all to authenticated
  using (private.teaches_student(student_id)) with check (private.teaches_student(student_id));

-- ---------- lesson library -------------------------------------------------
-- teachers: own + co-teachers' + templates; students/parents: their class teachers' lessons
create policy lessons_select on public.lessons for select to authenticated
  using (owner_id = any ((select private.lesson_owner_ids())::uuid[])
         or (is_template and (select private.is_staff())));
create policy lessons_owner_write on public.lessons for all to authenticated
  using (owner_id = (select auth.uid()) and (select private.is_staff()))
  with check (owner_id = (select auth.uid()) and (select private.is_staff()));

-- child tables follow lesson visibility (subquery is itself filtered by lessons RLS)
create policy sections_select on public.lesson_sections for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));
create policy sections_owner_write on public.lesson_sections for all to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.owner_id = (select auth.uid())));

create policy materials_select on public.lesson_materials for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));
create policy materials_owner_write on public.lesson_materials for all to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.owner_id = (select auth.uid())));

create policy lpq_select on public.lesson_parent_questions for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));
create policy lpq_owner_write on public.lesson_parent_questions for all to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.owner_id = (select auth.uid())));

-- ---------- live sessions & attendance -------------------------------------
create policy sessions_select on public.live_sessions for select to authenticated
  using (group_id = any ((select private.my_group_ids())::uuid[]));
create policy sessions_teacher_write on public.live_sessions for all to authenticated
  using (private.teaches_group(group_id))
  with check (private.teaches_group(group_id) and teacher_id = (select auth.uid()));

create policy attendance_select on public.attendance for select to authenticated
  using (student_id = any ((select private.visible_student_ids())::uuid[]));
create policy attendance_teacher_write on public.attendance for all to authenticated
  using (private.teaches_student(student_id)) with check (private.teaches_student(student_id));

-- ---------- trainings & observations (teachers read their own) ------------
create policy trainings_select on public.trainings for select to authenticated
  using ((select private.is_staff()));
create policy training_att_select on public.training_attendance for select to authenticated
  using (teacher_id = (select auth.uid()));
create policy observations_select on public.observations for select to authenticated
  using (teacher_id = (select auth.uid()));

-- ---------- homework ----------------------------------------------------------
create policy assignments_select on public.assignments for select to authenticated
  using (
    created_by = (select auth.uid())
    or ((select private.is_staff())
        and (private.teaches_group(target_group_id) or private.teaches_student(target_student_id)))
    or (is_published
        and (target_group_id = any ((select private.my_group_ids())::uuid[])
             or target_student_id = any ((select private.visible_student_ids())::uuid[]))));
create policy assignments_teacher_write on public.assignments for all to authenticated
  using ((select private.is_staff())
         and (private.teaches_group(target_group_id) or private.teaches_student(target_student_id)))
  with check ((select private.is_staff())
         and (private.teaches_group(target_group_id) or private.teaches_student(target_student_id)));

-- Students see/insert/update only their own; parents read children's; teachers their students'.
create policy submissions_select on public.submissions for select to authenticated
  using (student_id = any ((select private.visible_student_ids())::uuid[]));
create policy submissions_student_insert on public.submissions for insert to authenticated
  with check (student_id = (select auth.uid())
              and exists (select 1 from public.assignments a where a.id = assignment_id));  -- must be visible to them
create policy submissions_student_update on public.submissions for update to authenticated
  using (student_id = (select auth.uid()) and status in ('submitted', 'returned'))
  with check (student_id = (select auth.uid()));
create policy submissions_teacher_update on public.submissions for update to authenticated
  using (private.teaches_student(student_id)) with check (private.teaches_student(student_id));

-- Grades: teachers full access for their students; student/parent only once approved.
create policy grades_teacher_all on public.submission_grades for all to authenticated
  using (exists (select 1 from public.submissions s
                 where s.id = submission_id and private.teaches_student(s.student_id)))
  with check (exists (select 1 from public.submissions s
                 where s.id = submission_id and private.teaches_student(s.student_id)));
create policy grades_released_select on public.submission_grades for select to authenticated
  using (exists (select 1 from public.submissions s
                 where s.id = submission_id
                   and s.status = 'approved'
                   and s.student_id = any ((select private.visible_student_ids())::uuid[])));
-- NOTE: once approved, ai_feedback is still a column on the row. The client
-- should select only final_score/final_feedback; if the AI draft must stay
-- hidden, read via public.my_grades (below) which omits AI columns.

create policy mistakes_select on public.student_mistakes for select to authenticated
  using (student_id = any ((select private.visible_student_ids())::uuid[]));
create policy mistakes_teacher_write on public.student_mistakes for all to authenticated
  using (private.teaches_student(student_id)) with check (private.teaches_student(student_id));

-- ---------- announcements ----------------------------------------------------
create policy announcements_select on public.announcements for select to authenticated
  using (private.can_view_announcement(audience, target_id, author_id));
-- Teachers post only to their own classes/groups.
create policy announcements_teacher_write on public.announcements for all to authenticated
  using (author_id = (select auth.uid()) and (select private.is_teacher()))
  with check (author_id = (select auth.uid()) and (select private.is_teacher())
              and ((audience = 'class' and private.teaches_class(target_id))
                or (audience = 'group' and private.teaches_group(target_id))));

-- ---------- gamification (writes: service_role jobs; teachers award badges) ----
create policy challenges_select on public.daily_challenges for select to authenticated
  using (student_id = any ((select private.visible_student_ids())::uuid[]));
create policy streaks_select on public.streaks for select to authenticated
  using (student_id = any ((select private.visible_student_ids())::uuid[]));
create policy student_badges_select on public.student_badges for select to authenticated
  using (student_id = any ((select private.visible_student_ids())::uuid[]));
create policy student_badges_teacher_write on public.student_badges for insert to authenticated
  with check (private.teaches_student(student_id) and awarded_by = (select auth.uid()));
create policy watching_select on public.watching_time for select to authenticated
  using (class_id is null or class_id = any ((select private.my_class_ids())::uuid[]));
create policy watching_teacher_write on public.watching_time for all to authenticated
  using (private.teaches_class(class_id)) with check (private.teaches_class(class_id));
create policy watching_results_select on public.watching_time_results for select to authenticated
  using (student_id = any ((select private.visible_student_ids())::uuid[]));
create policy weekly_scores_select on public.weekly_scores for select to authenticated
  using (student_id = any ((select private.visible_student_ids())::uuid[]));
create policy mystery_openings_select on public.mystery_box_openings for select to authenticated
  using (student_id = any ((select private.visible_student_ids())::uuid[]));

-- =============================================================================
-- 13. VIEWS
-- =============================================================================

-- Internal ranking over ALL students (not exposed: private schema, no grants).
create or replace view private.weekly_ranking as
select ws.week_start,
       ws.student_id,
       p.full_name,
       p.avatar_url,
       ws.group_id,
       g.class_id,
       ws.total_score,
       ws.base_score,
       ws.streak_bonus + ws.badge_bonus + ws.watching_bonus as bonus_total,
       rank() over (partition by ws.group_id, ws.week_start order by ws.total_score desc) as group_rank,
       rank() over (partition by g.class_id,  ws.week_start order by ws.total_score desc) as class_rank
  from public.weekly_scores ws
  join public.groups   g on g.id = ws.group_id
  join public.profiles p on p.id = ws.student_id;

-- Weekly leaderboard per group.
-- Runs with the view owner's rights (bypasses weekly_scores RLS) and filters
-- itself:  head -> all; teacher -> full ranking of own groups;
--          student/parent -> top-3 of own (child's) group + own (child's) rank.
create or replace view public.weekly_group_leaderboard
with (security_invoker = false) as
select r.*
  from private.weekly_ranking r
 where private.is_head_teacher()
    or private.teaches_group(r.group_id)
    or (r.group_id = any (private.my_group_ids())
        and (r.group_rank <= 3 or r.student_id = any (private.visible_student_ids())));

-- Top-3 per class per week.
create or replace view public.weekly_class_top3
with (security_invoker = false) as
select r.week_start, r.class_id, r.class_rank, r.student_id, r.full_name, r.avatar_url, r.total_score
  from private.weekly_ranking r
 where r.class_rank <= 3
   and (private.is_head_teacher() or r.class_id = any (private.my_class_ids()));

-- Student/parent-facing grades (hides AI draft columns). Respects RLS.
create or replace view public.my_grades
with (security_invoker = true) as
select s.id as submission_id, s.assignment_id, s.student_id, s.submitted_at, s.is_late, s.status,
       g.final_score, g.final_feedback, g.approved_at
  from public.submissions s
  left join public.submission_grades g on g.submission_id = s.id;

-- Parent digest: today's lessons of each child + "ask your child" questions. Respects RLS.
create or replace view public.parent_today_digest
with (security_invoker = true) as
select ps.student_id,
       ls.id          as session_id,
       ls.starts_at,
       l.id           as lesson_id,
       l.title        as lesson_title,
       l.parent_summary_uz,
       l.parent_summary_en,
       coalesce(jsonb_agg(jsonb_build_object('position', q.position, 'uz', q.question_uz,
                                             'en', q.question_en) order by q.position)
                filter (where q.id is not null), '[]'::jsonb) as ask_your_child
  from public.parent_students ps
  join public.students s        on s.profile_id = ps.student_id
  join public.live_sessions ls  on ls.group_id = s.group_id
                               and (ls.starts_at at time zone 'Asia/Tashkent')::date
                                   = (now() at time zone 'Asia/Tashkent')::date
  left join public.lessons l    on l.id = ls.lesson_id
  left join public.lesson_parent_questions q on q.lesson_id = l.id
 where ps.parent_id = auth.uid()
 group by ps.student_id, ls.id, ls.starts_at, l.id, l.title, l.parent_summary_uz, l.parent_summary_en;

revoke all on public.weekly_group_leaderboard, public.weekly_class_top3,
              public.my_grades, public.parent_today_digest from anon;
grant select on public.weekly_group_leaderboard, public.weekly_class_top3,
                public.my_grades, public.parent_today_digest to authenticated;

-- =============================================================================
-- END
-- =============================================================================
