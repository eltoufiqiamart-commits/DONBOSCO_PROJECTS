create or replace function public.admin_save_site_content(p_content jsonb, p_statistics jsonb)
returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
declare item jsonb; allowed_key text;
begin
  if not public.is_project_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  for item in select value from jsonb_array_elements(coalesce(p_content,'[]'::jsonb)) loop
    allowed_key := item->>'key';
    if allowed_key not in ('home.hero_title','home.hero_description','home.industry_title','home.industry_description','home.final_title','home.final_description') then raise exception 'invalid_content_key'; end if;
    if nullif(btrim(item->>'en'),'') is null or nullif(btrim(item->>'ar'),'') is null or nullif(btrim(item->>'it'),'') is null then raise exception 'missing_translation'; end if;
    insert into public.site_content(key,content_en,content_ar,content_it,is_visible)
    values(allowed_key,btrim(item->>'en'),btrim(item->>'ar'),btrim(item->>'it'),true)
    on conflict(key) do update set content_en=excluded.content_en,content_ar=excluded.content_ar,content_it=excluded.content_it,is_visible=true;
  end loop;
  if p_statistics is not null then
    update public.statistics_config set
      show_projects=coalesce((p_statistics->>'projects')::boolean,show_projects),
      show_departments=coalesce((p_statistics->>'departments')::boolean,show_departments),
      show_teams=coalesce((p_statistics->>'teams')::boolean,show_teams),
      show_years=coalesce((p_statistics->>'years')::boolean,show_years)
    where id=true;
  end if;
  insert into public.admin_activity_logs(admin_user_id,action,entity_type,details)
  values(auth.uid(),'content.updated','site_content',jsonb_build_object('keys',jsonb_array_length(coalesce(p_content,'[]'::jsonb))));
end;
$$;
revoke all on function public.admin_save_site_content(jsonb,jsonb) from public, anon;
grant execute on function public.admin_save_site_content(jsonb,jsonb) to authenticated;
