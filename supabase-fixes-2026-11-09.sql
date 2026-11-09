-- 9-noyabr: Claude kiritgan o'zgarishlar (Supabase'da allaqachon qo'llangan).

-- 1) O'quvchi o'z ishini "approved" qila olmaydi (trigger himoyasiga qo'shimcha).
alter policy submissions_student_update on public.submissions
  with check (student_id = (select auth.uid()) and status = 'submitted'::submission_status);

-- 2) Kirmagan foydalanuvchi (anon) security-definer funksiyalarni chaqira olmaydi.
--    Hamma public security-definer funksiyalardan anon EXECUTE olib tashlandi, authenticated'ga berildi.
--    bot_cfg faqat service_role uchun:
revoke execute on function public.bot_cfg(text) from public, anon, authenticated;
alter function private.esc_html set search_path = public, pg_temp;

-- 3) Namuna dars o'quvchiga faqat o'qituvchisi undan nusxa olmagan bo'lsa ko'rinadi (bir mavzu ikki marta chiqmaydi).
create or replace function private.template_copied_by_my_teachers(p_template uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.lessons c
                  where c.copied_from = p_template and c.owner_id = any (private.lesson_owner_ids()));
$$;
drop policy if exists lessons_template_read on public.lessons;
create policy lessons_template_read on public.lessons for select to authenticated
  using (is_template and ((select private.is_staff()) or not private.template_copied_by_my_teachers(id)));

-- 4) submit_quiz endi ota-ona uchun o'zbekcha xulosa yozadi (submission_grades.feedback_uz):
--    "Testda 7 ta savoldan 6 tasiga to'g'ri javob berdi (86 ball). ..."
--    To'liq matn Supabase'dagi public.submit_quiz funksiyasida.

-- 5) ai-check Edge Function v7 (supabase-ai-check.ts): daftar surati (JPG/PNG/WEBP/HEIC) ham tekshiriladi,
--    o'quvchi 1 ishni 1 marta tekshirtiradi, xatolar daftari takrorlanmaydi, aniq xato xabarlari.
