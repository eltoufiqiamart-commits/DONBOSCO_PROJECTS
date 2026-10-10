-- Narrow client privileges, keep the administrator identity and inquiry data private,
-- and expose only the RPCs used by the public site and single-admin console.

grant usage on schema public to anon, authenticated, service_role;

create or replace function public.admin_get_project(p_project_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.is_project_admin() then (
    select (to_jsonb(p) - 'created_by') || jsonb_build_object(
      'project_tags', coalesce((select jsonb_agg(jsonb_build_object('tags',to_jsonb(tag))) from public.project_tags pt join public.tags tag on tag.id=pt.tag_id where pt.project_id=p.id), '[]'::jsonb),
      'project_categories', coalesce((select jsonb_agg(jsonb_build_object('categories',to_jsonb(category))) from public.project_categories pc join public.categories category on category.id=pc.category_id where pc.project_id=p.id), '[]'::jsonb),
      'project_media', coalesce((select jsonb_agg(to_jsonb(media) order by media.sort_order) from public.project_media media where media.project_id=p.id), '[]'::jsonb),
      'project_awards', coalesce((select jsonb_agg(to_jsonb(award)) from public.project_awards award where award.project_id=p.id), '[]'::jsonb)
    )
    from public.projects p where p.id=p_project_id
  ) else null end;
$$;
revoke all on function public.admin_get_project(uuid) from public, anon;
grant execute on function public.admin_get_project(uuid) to authenticated;

-- Public project reads are intentionally column-limited. The creator UUID and
-- supervisor names are available only to server-side admin workflows.
revoke all on public.projects from public, anon, authenticated;
grant select (
  id,slug,title_en,title_ar,title_it,
  short_description_en,short_description_ar,short_description_it,
  description_en,description_ar,description_it,
  problem_statement_en,problem_statement_ar,problem_statement_it,
  objectives_en,objectives_ar,objectives_it,
  proposed_solution_en,proposed_solution_ar,proposed_solution_it,
  technical_implementation_en,technical_implementation_ar,technical_implementation_it,
  technical_specifications,
  academic_program_en,academic_program_ar,academic_program_it,
  project_duration_en,project_duration_ar,project_duration_it,
  department_id,team_id,graduation_year,completion_date,status,featured,award_winning,industry_status,
  cover_image_path,cover_alt_en,cover_alt_ar,cover_alt_it,views_count,published_at,created_at,updated_at
) on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;

-- The only client-readable tables are protected by row-level policies. Authenticated
-- users need write grants for admin RPCs; the policies still reject every non-admin.
grant select on public.departments, public.students, public.teams, public.team_members,
  public.tags, public.project_tags, public.categories, public.project_categories,
  public.project_media, public.project_awards, public.announcements, public.site_content,
  public.statistics_config to anon, authenticated;

grant insert, update, delete on public.departments, public.students, public.teams, public.team_members,
  public.tags, public.project_tags, public.categories, public.project_categories,
  public.project_media, public.project_awards, public.announcements, public.site_content,
  public.statistics_config to authenticated;

grant select, update, delete on public.inquiries to authenticated;
grant select on public.project_views to authenticated;
grant select, insert on public.admin_activity_logs to authenticated;
grant select, insert, update, delete on public.media_uploads to authenticated;

-- Server-only code uses this role after explicit authorization or for public media
-- delivery and the public inquiry/view RPCs.
grant all privileges on all tables in schema public to service_role;
revoke all on public.admin_allowlist from service_role;

grant execute on function public.normalize_project_search(text) to anon, authenticated;
grant execute on function public.search_published_projects(text,text,text,integer,text,boolean,boolean,boolean,boolean,text,integer,integer) to anon, authenticated;
grant execute on function public.get_project_facets() to anon, authenticated;
grant execute on function public.get_public_graduation_year_count() to anon, authenticated;
grant execute on function public.get_public_department_count() to anon, authenticated;
grant execute on function public.admin_list_projects(text,text,integer,integer) to authenticated;
grant execute on function public.admin_get_overview() to authenticated;
grant execute on function public.admin_save_project(jsonb,uuid) to authenticated;
grant execute on function public.admin_save_team(jsonb,uuid) to authenticated;
grant execute on function public.admin_save_student(jsonb,uuid) to authenticated;
grant execute on function public.admin_update_department(uuid,jsonb) to authenticated;
grant execute on function public.admin_save_site_content(jsonb,jsonb) to authenticated;
grant execute on function public.record_project_view(text,text) to service_role;
grant execute on function public.submit_public_inquiry(text,text,text,text,uuid,text,text) to service_role;

revoke all on public.admin_allowlist from public, anon, authenticated;
