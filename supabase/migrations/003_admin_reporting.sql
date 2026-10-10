create or replace function public.admin_get_overview()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select case when public.is_project_admin() then jsonb_build_object(
    'counts', jsonb_build_object(
      'published', (select count(*) from public.projects where status='published'),
      'draft', (select count(*) from public.projects where status='draft'),
      'pending', (select count(*) from public.projects where status='pending'),
      'rejected', (select count(*) from public.projects where status='rejected'),
      'archived', (select count(*) from public.projects where status='archived'),
      'teams', (select count(*) from public.teams),
      'students', (select count(*) from public.students),
      'inquiries', (select count(*) from public.inquiries where status='new'),
      'views', coalesce((select sum(views_count) from public.projects),0)
    ),
    'byDepartment', coalesce((
      select jsonb_agg(jsonb_build_object('department_id',d.id,'slug',d.slug,'name_en',d.name_en,'name_ar',d.name_ar,'name_it',d.name_it,'count',x.project_count) order by d.display_order)
      from public.departments d left join (
        select department_id,count(*) as project_count from public.projects group by department_id
      ) x on x.department_id=d.id
    ), '[]'::jsonb),
    'byYear', coalesce((select jsonb_agg(jsonb_build_object('year',y.graduation_year,'count',y.project_count) order by y.graduation_year desc) from (select graduation_year,count(*) as project_count from public.projects group by graduation_year) y), '[]'::jsonb),
    'recentActivity', coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'action',a.action,'entity_type',a.entity_type,'entity_id',a.entity_id,'details',a.details,'created_at',a.created_at) order by a.created_at desc) from (select * from public.admin_activity_logs order by created_at desc limit 10) a), '[]'::jsonb)
  ) else '{}'::jsonb end;
$$;
revoke all on function public.admin_get_overview() from public, anon;
grant execute on function public.admin_get_overview() to authenticated;
