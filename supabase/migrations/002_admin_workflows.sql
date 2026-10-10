-- Transactional admin save functions. These run as the signed-in administrator
-- and still remain subject to the allow-list and row-level security policies.

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
      published_at,created_by
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
revoke all on function public.admin_save_project(jsonb,uuid) from public, anon;
grant execute on function public.admin_save_project(jsonb,uuid) to authenticated;

create or replace function public.admin_save_team(p_payload jsonb, p_team_id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = public, auth
as $$
declare v_id uuid := coalesce(p_team_id,gen_random_uuid()); v_item jsonb; v_member uuid;
begin
  if not public.is_project_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  if p_team_id is not null and not exists(select 1 from public.teams where id=p_team_id) then raise exception 'team_not_found'; end if;
  if nullif(p_payload->>'imagePath','') is not null and not exists(select 1 from public.media_uploads where bucket_name='team-images' and object_path=p_payload->>'imagePath' and uploaded_by=auth.uid()) and not exists(select 1 from public.teams where id=v_id and image_path=p_payload->>'imagePath') then raise exception 'invalid_team_image'; end if;
  if p_team_id is null then
    insert into public.teams(id,slug,name_en,name_ar,name_it,short_description_en,short_description_ar,short_description_it,department_id,graduation_year,image_path,is_public,status)
    values(v_id,p_payload->>'slug',p_payload->'name'->>'en',nullif(p_payload->'name'->>'ar',''),nullif(p_payload->'name'->>'it',''),nullif(p_payload->'description'->>'en',''),nullif(p_payload->'description'->>'ar',''),nullif(p_payload->'description'->>'it',''),nullif(p_payload->>'departmentId','')::uuid,nullif(p_payload->>'graduationYear','')::integer,nullif(p_payload->>'imagePath',''),coalesce((p_payload->>'isPublic')::boolean,false),p_payload->>'status');
  else
    update public.teams set slug=p_payload->>'slug',name_en=p_payload->'name'->>'en',name_ar=nullif(p_payload->'name'->>'ar',''),name_it=nullif(p_payload->'name'->>'it',''),short_description_en=nullif(p_payload->'description'->>'en',''),short_description_ar=nullif(p_payload->'description'->>'ar',''),short_description_it=nullif(p_payload->'description'->>'it',''),department_id=nullif(p_payload->>'departmentId','')::uuid,graduation_year=nullif(p_payload->>'graduationYear','')::integer,image_path=nullif(p_payload->>'imagePath',''),is_public=coalesce((p_payload->>'isPublic')::boolean,false),status=p_payload->>'status' where id=v_id;
  end if;
  delete from public.team_members where team_id=v_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'memberIds','[]'::jsonb)) loop
    v_member := (v_item #>> '{}')::uuid;
    insert into public.team_members(team_id,student_id,display_order) values(v_id,v_member,0) on conflict do nothing;
  end loop;
  update public.media_uploads set claimed_at=now() where uploaded_by=auth.uid() and bucket_name='team-images' and object_path=nullif(p_payload->>'imagePath','');
  insert into public.admin_activity_logs(admin_user_id,action,entity_type,entity_id,details) values(auth.uid(),case when p_team_id is null then 'team.created' else 'team.updated' end,'team',v_id,jsonb_build_object('status',p_payload->>'status'));
  return v_id;
end;
$$;
revoke all on function public.admin_save_team(jsonb,uuid) from public, anon;
grant execute on function public.admin_save_team(jsonb,uuid) to authenticated;

create or replace function public.admin_save_student(p_payload jsonb, p_student_id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = public, auth
as $$
declare v_id uuid := coalesce(p_student_id,gen_random_uuid());
begin
  if not public.is_project_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  if p_student_id is null then
    insert into public.students(id,display_name_en,display_name_ar,display_name_it,bio_en,bio_ar,bio_it,profile_image_path,is_public_profile)
    values(v_id,p_payload->'displayName'->>'en',nullif(p_payload->'displayName'->>'ar',''),nullif(p_payload->'displayName'->>'it',''),nullif(p_payload->'bio'->>'en',''),nullif(p_payload->'bio'->>'ar',''),nullif(p_payload->'bio'->>'it',''),nullif(p_payload->>'profileImagePath',''),coalesce((p_payload->>'isPublicProfile')::boolean,false));
  else
    update public.students set display_name_en=p_payload->'displayName'->>'en',display_name_ar=nullif(p_payload->'displayName'->>'ar',''),display_name_it=nullif(p_payload->'displayName'->>'it',''),bio_en=nullif(p_payload->'bio'->>'en',''),bio_ar=nullif(p_payload->'bio'->>'ar',''),bio_it=nullif(p_payload->'bio'->>'it',''),is_public_profile=coalesce((p_payload->>'isPublicProfile')::boolean,false) where id=v_id;
  end if;
  insert into public.admin_activity_logs(admin_user_id,action,entity_type,entity_id) values(auth.uid(),case when p_student_id is null then 'student.created' else 'student.updated' end,'student',v_id);
  return v_id;
end;
$$;
revoke all on function public.admin_save_student(jsonb,uuid) from public, anon;
grant execute on function public.admin_save_student(jsonb,uuid) to authenticated;

create or replace function public.admin_update_department(p_department_id uuid, p_payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
begin
  if not public.is_project_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  if nullif(p_payload->>'coverImagePath','') is not null and not exists(select 1 from public.media_uploads where bucket_name='department-images' and object_path=p_payload->>'coverImagePath' and uploaded_by=auth.uid()) and not exists(select 1 from public.departments where id=p_department_id and cover_image_path=p_payload->>'coverImagePath') then raise exception 'invalid_department_image'; end if;
  update public.departments set
    name_en=p_payload->'name'->>'en',name_ar=nullif(p_payload->'name'->>'ar',''),name_it=nullif(p_payload->'name'->>'it',''),
    description_en=coalesce(p_payload->'description'->>'en',''),description_ar=coalesce(p_payload->'description'->>'ar',''),description_it=coalesce(p_payload->'description'->>'it',''),
    cover_image_path=nullif(p_payload->>'coverImagePath',''),is_active=coalesce((p_payload->>'isActive')::boolean,true),display_order=coalesce((p_payload->>'displayOrder')::integer,100)
  where id=p_department_id;
  if not found then raise exception 'department_not_found'; end if;
  update public.media_uploads set claimed_at=now() where uploaded_by=auth.uid() and bucket_name='department-images' and object_path=nullif(p_payload->>'coverImagePath','');
  insert into public.admin_activity_logs(admin_user_id,action,entity_type,entity_id) values(auth.uid(),'department.updated','department',p_department_id);
end;
$$;
revoke all on function public.admin_update_department(uuid,jsonb) from public, anon;
grant execute on function public.admin_update_department(uuid,jsonb) to authenticated;

