-- Don Bosco Cairo Projects — migration 007: optional project demo link.
--
-- REVIEW ONLY. This file is not applied by the application and must be reviewed by
-- the institute's database owner before it is run. Nothing in the TypeScript code
-- depends on it existing: until it is applied the public site simply renders no demo
-- button and the administrator console disables the demo field and explains why.
--
-- Why a schema change is required:
--   * a demo URL is per-project data and must be stored, filterable and auditable like
--     the rest of the project record; keeping it inside `technical_specifications`
--     would make it an unvalidated, unsearchable free-text entry;
--   * updates that omit the optional demo fields must preserve existing values. This
--     protects saved links if an older/temporarily disabled form edits other fields.
--   * it needs an independent visibility switch, so that a link can be kept for the
--     institutional record while staying hidden from the public page.
--
-- What this migration does:
--   1. adds `demo_url` (text, https-only) and `demo_visible` (boolean, default true);
--   2. adds restricted RPCs: the public RPC returns a URL only when the project is
--      published and the link is visible; the admin capability RPC confirms migration
--      availability without exposing the columns;
--   3. recreates `public.admin_save_project` with the two new fields. Its existing
--      validation, RLS boundary and activity-log logic are preserved; updates only
--      overwrite demo values when those keys are explicitly supplied in the payload.
--
-- Not covered on purpose: `search_published_projects` keeps returning its explicit
-- column list, so list/card payloads are unchanged; the demo button is detail-page
-- only. If a badge on cards is ever wanted, extend that function in a later migration.

alter table public.projects
  add column if not exists demo_url text,
  add column if not exists demo_visible boolean not null default true;

-- Keep stored links to https:// only, mirroring the Zod rule in src/lib/validation.ts.
alter table public.projects drop constraint if exists projects_demo_url_https_check;
alter table public.projects
  add constraint projects_demo_url_https_check
  check (demo_url is null or demo_url ~ '^https://[^[:space:]]+$');

-- Never grant direct SELECT on demo columns: even a hidden link must not be readable
-- through the public PostgREST table endpoint. Revoke as well so this migration stays
-- safe if an earlier draft was applied manually.
revoke select on public.projects from public, anon, authenticated;
revoke select (demo_url, demo_visible) on public.projects from public, anon, authenticated;

-- Public access is intentionally mediated by this function. SECURITY DEFINER is
-- necessary because direct demo-column SELECT is withheld from client roles; the
-- explicit predicates preserve the public-only contract even though it bypasses RLS.
create or replace function public.get_public_project_demo_url(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.demo_url
  from public.projects p
  where p.id = p_project_id
    and p.status = 'published'
    and p.demo_visible is true
    and p.demo_url is not null;
$$;
revoke all on function public.get_public_project_demo_url(uuid) from public, anon, authenticated;
grant execute on function public.get_public_project_demo_url(uuid) to anon, authenticated;

-- Existence of this RPC is the capability signal for the admin form. It returns no
-- data about projects and avoids granting direct access to the demo columns.
create or replace function public.project_demo_columns_supported()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select true;
$$;
revoke all on function public.project_demo_columns_supported() from public, anon, authenticated;
grant execute on function public.project_demo_columns_supported() to authenticated;

create or replace function public.admin_save_project(p_payload jsonb, p_project_id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  v_id uuid := coalesce(p_project_id, gen_random_uuid());
  v_status text := coalesce(p_payload->>'status', 'draft');
  v_cover text := nullif(p_payload->>'coverImagePath', '');
  v_item jsonb;
  v_tag_id uuid;
  v_category_id uuid;
  v_previous_status text;
begin
  if not public.is_project_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_payload->>'title' is null or p_payload->'title'->>'en' is null then raise exception 'title_required'; end if;
  if p_project_id is not null then
    select status into v_previous_status from public.projects where id=p_project_id;
    if v_previous_status is null then raise exception 'project_not_found'; end if;
  end if;
  if v_cover is not null and not exists (
    select 1 from public.media_uploads u where u.bucket_name='project-covers' and u.object_path=v_cover and u.uploaded_by=auth.uid()
  ) and not exists (select 1 from public.projects p where p.id=v_id and p.cover_image_path=v_cover) then
    raise exception 'invalid_cover_upload';
  end if;
  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'media','[]'::jsonb)) loop
    if v_item->>'kind' in ('image','document') and not exists (
      select 1 from public.media_uploads u
      where u.bucket_name=v_item->>'bucket_name' and u.object_path=v_item->>'object_path' and u.uploaded_by=auth.uid()
    ) and not exists (
      select 1 from public.project_media m where m.project_id=v_id and m.bucket_name=v_item->>'bucket_name' and m.object_path=v_item->>'object_path'
    ) then raise exception 'invalid_media_upload'; end if;
  end loop;

  if p_project_id is null then
    insert into public.projects (
      id, slug, title_en,title_ar,title_it, short_description_en,short_description_ar,short_description_it,
      description_en,description_ar,description_it, problem_statement_en,problem_statement_ar,problem_statement_it,
      objectives_en,objectives_ar,objectives_it, proposed_solution_en,proposed_solution_ar,proposed_solution_it,
      technical_implementation_en,technical_implementation_ar,technical_implementation_it, technical_specifications,
      academic_program_en,academic_program_ar,academic_program_it, project_duration_en,project_duration_ar,project_duration_it,
      department_id,team_id,supervisor_name_en,supervisor_name_ar,supervisor_name_it,graduation_year,completion_date,
      status,featured,award_winning,industry_status,cover_image_path,cover_alt_en,cover_alt_ar,cover_alt_it,
      demo_url,demo_visible,published_at,created_by
    ) values (
      v_id,p_payload->>'slug',p_payload->'title'->>'en',nullif(p_payload->'title'->>'ar',''),nullif(p_payload->'title'->>'it',''),
      nullif(p_payload->'shortDescription'->>'en',''),nullif(p_payload->'shortDescription'->>'ar',''),nullif(p_payload->'shortDescription'->>'it',''),
      nullif(p_payload->'description'->>'en',''),nullif(p_payload->'description'->>'ar',''),nullif(p_payload->'description'->>'it',''),
      nullif(p_payload->'problemStatement'->>'en',''),nullif(p_payload->'problemStatement'->>'ar',''),nullif(p_payload->'problemStatement'->>'it',''),
      nullif(p_payload->'objectives'->>'en',''),nullif(p_payload->'objectives'->>'ar',''),nullif(p_payload->'objectives'->>'it',''),
      nullif(p_payload->'proposedSolution'->>'en',''),nullif(p_payload->'proposedSolution'->>'ar',''),nullif(p_payload->'proposedSolution'->>'it',''),
      nullif(p_payload->'technicalImplementation'->>'en',''),nullif(p_payload->'technicalImplementation'->>'ar',''),nullif(p_payload->'technicalImplementation'->>'it',''),
      coalesce(p_payload->'technicalSpecifications','{}'::jsonb),
      nullif(p_payload->'academicProgram'->>'en',''),nullif(p_payload->'academicProgram'->>'ar',''),nullif(p_payload->'academicProgram'->>'it',''),
      nullif(p_payload->'projectDuration'->>'en',''),nullif(p_payload->'projectDuration'->>'ar',''),nullif(p_payload->'projectDuration'->>'it',''),
      (p_payload->>'departmentId')::uuid,nullif(p_payload->>'teamId','')::uuid,
      nullif(p_payload->'supervisorName'->>'en',''),nullif(p_payload->'supervisorName'->>'ar',''),nullif(p_payload->'supervisorName'->>'it',''),
      (p_payload->>'graduationYear')::integer,nullif(p_payload->>'completionDate','')::date,
      v_status,coalesce((p_payload->>'featured')::boolean,false),coalesce((p_payload->>'awardWinning')::boolean,false),coalesce(p_payload->>'industryStatus','none'),v_cover,
      nullif(p_payload->'coverAlt'->>'en',''),nullif(p_payload->'coverAlt'->>'ar',''),nullif(p_payload->'coverAlt'->>'it',''),
      nullif(p_payload->>'demoUrl',''),coalesce((p_payload->>'demoVisible')::boolean,true),
      case when v_status='published' then now() else null end,auth.uid()
    );
  else
    update public.projects set
      slug=p_payload->>'slug',
      title_en=p_payload->'title'->>'en',title_ar=nullif(p_payload->'title'->>'ar',''),title_it=nullif(p_payload->'title'->>'it',''),
      short_description_en=nullif(p_payload->'shortDescription'->>'en',''),short_description_ar=nullif(p_payload->'shortDescription'->>'ar',''),short_description_it=nullif(p_payload->'shortDescription'->>'it',''),
      description_en=nullif(p_payload->'description'->>'en',''),description_ar=nullif(p_payload->'description'->>'ar',''),description_it=nullif(p_payload->'description'->>'it',''),
      problem_statement_en=nullif(p_payload->'problemStatement'->>'en',''),problem_statement_ar=nullif(p_payload->'problemStatement'->>'ar',''),problem_statement_it=nullif(p_payload->'problemStatement'->>'it',''),
      objectives_en=nullif(p_payload->'objectives'->>'en',''),objectives_ar=nullif(p_payload->'objectives'->>'ar',''),objectives_it=nullif(p_payload->'objectives'->>'it',''),
      proposed_solution_en=nullif(p_payload->'proposedSolution'->>'en',''),proposed_solution_ar=nullif(p_payload->'proposedSolution'->>'ar',''),proposed_solution_it=nullif(p_payload->'proposedSolution'->>'it',''),
      technical_implementation_en=nullif(p_payload->'technicalImplementation'->>'en',''),technical_implementation_ar=nullif(p_payload->'technicalImplementation'->>'ar',''),technical_implementation_it=nullif(p_payload->'technicalImplementation'->>'it',''),
      technical_specifications=coalesce(p_payload->'technicalSpecifications','{}'::jsonb),
      academic_program_en=nullif(p_payload->'academicProgram'->>'en',''),academic_program_ar=nullif(p_payload->'academicProgram'->>'ar',''),academic_program_it=nullif(p_payload->'academicProgram'->>'it',''),
      project_duration_en=nullif(p_payload->'projectDuration'->>'en',''),project_duration_ar=nullif(p_payload->'projectDuration'->>'ar',''),project_duration_it=nullif(p_payload->'projectDuration'->>'it',''),
      department_id=(p_payload->>'departmentId')::uuid,team_id=nullif(p_payload->>'teamId','')::uuid,
      supervisor_name_en=nullif(p_payload->'supervisorName'->>'en',''),supervisor_name_ar=nullif(p_payload->'supervisorName'->>'ar',''),supervisor_name_it=nullif(p_payload->'supervisorName'->>'it',''),
      graduation_year=(p_payload->>'graduationYear')::integer,completion_date=nullif(p_payload->>'completionDate','')::date,
      status=v_status,featured=coalesce((p_payload->>'featured')::boolean,false),award_winning=coalesce((p_payload->>'awardWinning')::boolean,false),
      industry_status=coalesce(p_payload->>'industryStatus','none'),cover_image_path=v_cover,
      cover_alt_en=nullif(p_payload->'coverAlt'->>'en',''),cover_alt_ar=nullif(p_payload->'coverAlt'->>'ar',''),cover_alt_it=nullif(p_payload->'coverAlt'->>'it',''),
      demo_url=case when p_payload ? 'demoUrl' then nullif(p_payload->>'demoUrl','') else demo_url end,
      demo_visible=case when p_payload ? 'demoVisible' then coalesce((p_payload->>'demoVisible')::boolean,true) else demo_visible end,
      published_at=case when v_status='published' then coalesce(published_at,now()) else null end
    where id=v_id;
  end if;

  delete from public.project_tags where project_id=v_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'tags','[]'::jsonb)) loop
    insert into public.tags(slug,label_en,label_ar,label_it)
    values(v_item->>'slug',v_item->>'label_en',nullif(v_item->>'label_ar',''),nullif(v_item->>'label_it',''))
    on conflict(slug) do update set label_en=excluded.label_en,label_ar=excluded.label_ar,label_it=excluded.label_it
    returning id into v_tag_id;
    insert into public.project_tags(project_id,tag_id) values(v_id,v_tag_id) on conflict do nothing;
  end loop;

  delete from public.project_categories where project_id=v_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'categories','[]'::jsonb)) loop
    insert into public.categories(slug,label_en,label_ar,label_it)
    values(v_item->>'slug',v_item->>'label_en',nullif(v_item->>'label_ar',''),nullif(v_item->>'label_it',''))
    on conflict(slug) do update set label_en=excluded.label_en,label_ar=excluded.label_ar,label_it=excluded.label_it
    returning id into v_category_id;
    insert into public.project_categories(project_id,category_id) values(v_id,v_category_id) on conflict do nothing;
  end loop;

  delete from public.project_media where project_id=v_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'media','[]'::jsonb)) loop
    insert into public.project_media(project_id,kind,bucket_name,object_path,video_url,title_en,title_ar,title_it,caption_en,caption_ar,caption_it,alt_en,alt_ar,alt_it,sort_order,is_public_approved)
    values(v_id,v_item->>'kind',v_item->>'bucket_name',nullif(v_item->>'object_path',''),nullif(v_item->>'video_url',''),
      nullif(v_item->>'title_en',''),nullif(v_item->>'title_ar',''),nullif(v_item->>'title_it',''),
      nullif(v_item->>'caption_en',''),nullif(v_item->>'caption_ar',''),nullif(v_item->>'caption_it',''),
      nullif(v_item->>'alt_en',''),nullif(v_item->>'alt_ar',''),nullif(v_item->>'alt_it',''),
      coalesce((v_item->>'sort_order')::integer,0),coalesce((v_item->>'is_public_approved')::boolean,false));
  end loop;

  delete from public.project_awards where project_id=v_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'awards','[]'::jsonb)) loop
    insert into public.project_awards(project_id,title_en,title_ar,title_it,issuer_en,issuer_ar,issuer_it,award_date,verified)
    values(v_id,v_item->>'title_en',nullif(v_item->>'title_ar',''),nullif(v_item->>'title_it',''),nullif(v_item->>'issuer_en',''),nullif(v_item->>'issuer_ar',''),nullif(v_item->>'issuer_it',''),nullif(v_item->>'award_date','')::date,coalesce((v_item->>'verified')::boolean,false));
  end loop;

  update public.media_uploads set claimed_at=now()
  where uploaded_by=auth.uid() and (
    (bucket_name='project-covers' and object_path=v_cover)
    or (bucket_name,object_path) in (select item->>'bucket_name',item->>'object_path' from jsonb_array_elements(coalesce(p_payload->'media','[]'::jsonb)) item where item->>'kind' in ('image','document'))
  );
  insert into public.admin_activity_logs(admin_user_id,action,entity_type,entity_id,details)
  values(auth.uid(),case when p_project_id is null then 'project.created' else 'project.updated' end,'project',v_id,jsonb_build_object('status',v_status));
  return v_id;
end;
$$;
-- `create or replace` keeps existing grants; restated so the privileges stay explicit.
revoke all on function public.admin_save_project(jsonb,uuid) from public, anon;
grant execute on function public.admin_save_project(jsonb,uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Rollback (manual, review before running):
--   alter table public.projects drop constraint if exists projects_demo_url_https_check;
--   alter table public.projects drop column if exists demo_visible;
--   alter table public.projects drop column if exists demo_url;
--   -- then restore public.admin_save_project from 002_admin_workflows.sql
-- ---------------------------------------------------------------------------
