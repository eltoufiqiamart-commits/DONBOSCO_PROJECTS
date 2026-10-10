create or replace function public.get_public_department_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(distinct p.department_id)::integer
  from public.projects p
  join public.departments d on d.id=p.department_id and d.is_active=true
  where p.status='published';
$$;
