-- Bir ota-ona -> bir nechta farzand: mavjud ota-onani login orqali biriktirish
begin;
create or replace function public.student_parents(p_student uuid)
returns table(parent_id uuid, login text, full_name text, children text)
language sql stable security definer set search_path to 'public','pg_temp' as $$
  select p.id, p.login, p.full_name,
         (select string_agg(c.full_name, ', ' order by c.full_name) from public.parent_students ps2 join public.profiles c on c.id = ps2.student_id where ps2.parent_id = p.id)
    from public.parent_students ps join public.profiles p on p.id = ps.parent_id
   where ps.student_id = p_student and (private.is_head_teacher() or private.teaches_student(p_student));
$$;
grant execute on function public.student_parents(uuid) to authenticated;

create or replace function public.link_parent(p_login text, p_student uuid)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $$
declare par public.profiles;
begin
  if not (private.is_head_teacher() or private.teaches_student(p_student)) then raise exception 'Bu o''quvchi sizniki emas'; end if;
  select * into par from public.profiles where login = lower(trim(p_login));
  if not found then raise exception 'Bunday login topilmadi'; end if;
  if par.role <> 'parent' then raise exception 'Bu login ota-onaniki emas'; end if;
  insert into public.parent_students (parent_id, student_id) values (par.id, p_student) on conflict do nothing;
  return jsonb_build_object('login', par.login, 'full_name', par.full_name,
    'children', (select string_agg(c.full_name, ', ') from public.parent_students ps join public.profiles c on c.id = ps.student_id where ps.parent_id = par.id));
end $$;
grant execute on function public.link_parent(text, uuid) to authenticated;

create or replace function public.unlink_parent(p_parent uuid, p_student uuid)
returns void language plpgsql security definer set search_path to 'public','pg_temp' as $$
begin
  if not (private.is_head_teacher() or private.teaches_student(p_student)) then raise exception 'Ruxsat yo''q'; end if;
  delete from public.parent_students where parent_id = p_parent and student_id = p_student;
end $$;
grant execute on function public.unlink_parent(uuid, uuid) to authenticated;
commit;
