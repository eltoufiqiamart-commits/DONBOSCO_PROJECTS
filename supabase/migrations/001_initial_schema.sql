-- Don Bosco Projects: normalized project archive, institutional content, and security model.
-- Apply with `supabase db push` or the Supabase CLI after linking the project.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.admin_allowlist (
  singleton boolean primary key default true check (singleton = true),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.admin_allowlist enable row level security;

create or replace function public.is_project_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.admin_allowlist a where a.singleton = true and a.user_id = auth.uid()
  );
$$;
revoke all on function public.is_project_admin() from public;
grant execute on function public.is_project_admin() to anon, authenticated, service_role;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_en text not null,
  name_ar text not null,
  name_it text not null,
  description_en text not null default '',
  description_ar text not null default '',
  description_it text not null default '',
  cover_image_path text,
  display_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.departments (slug, name_en, name_ar, name_it, description_en, description_ar, description_it, display_order)
values
  ('mechanical-technician', 'Mechanical Technician', 'فني ميكانيكي', 'Tecnico meccanico', '', '', '', 1),
  ('electrical-technician', 'Electrical Technician', 'فني كهربائي', 'Tecnico elettrico', '', '', '', 2),
  ('information-technology-technician', 'Information Technology Technician', 'فني تكنولوجيا المعلومات', 'Tecnico informatico', '', '', '', 3)
on conflict (slug) do nothing;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  display_name_en text not null,
  display_name_ar text,
  display_name_it text,
  bio_en text,
  bio_ar text,
  bio_it text,
  profile_image_path text,
  is_public_profile boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_en text not null,
  name_ar text,
  name_it text,
  short_description_en text,
  short_description_ar text,
  short_description_it text,
  department_id uuid references public.departments(id) on delete set null,
  graduation_year integer check (graduation_year between 1900 and 2200),
  image_path text,
  is_public boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  role_en text,
  role_ar text,
  role_it text,
  display_order integer not null default 0,
  primary key (team_id, student_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_en text not null,
  title_ar text,
  title_it text,
  short_description_en text,
  short_description_ar text,
  short_description_it text,
  description_en text,
  description_ar text,
  description_it text,
  problem_statement_en text,
  problem_statement_ar text,
  problem_statement_it text,
  objectives_en text,
  objectives_ar text,
  objectives_it text,
  proposed_solution_en text,
  proposed_solution_ar text,
  proposed_solution_it text,
  technical_implementation_en text,
  technical_implementation_ar text,
  technical_implementation_it text,
  technical_specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(technical_specifications) = 'object'),
  academic_program_en text,
  academic_program_ar text,
  academic_program_it text,
  project_duration_en text,
  project_duration_ar text,
  project_duration_it text,
  department_id uuid not null references public.departments(id) on delete restrict,
  team_id uuid references public.teams(id) on delete set null,
  supervisor_name_en text,
  supervisor_name_ar text,
  supervisor_name_it text,
  graduation_year integer not null check (graduation_year between 1900 and 2200),
  completion_date date,
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'rejected', 'archived')),
  featured boolean not null default false,
  award_winning boolean not null default false,
  industry_status text not null default 'none' check (industry_status in ('none', 'suitable', 'seeking_partner', 'in_development')),
  cover_image_path text,
  cover_alt_en text,
  cover_alt_ar text,
  cover_alt_it text,
  views_count bigint not null default 0 check (views_count >= 0),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label_en text not null,
  label_ar text,
  label_it text,
  created_at timestamptz not null default now()
);
create table if not exists public.project_tags (
  project_id uuid not null references public.projects(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (project_id, tag_id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label_en text not null,
  label_ar text,
  label_it text,
  created_at timestamptz not null default now()
);
create table if not exists public.project_categories (
  project_id uuid not null references public.projects(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (project_id, category_id)
);

create table if not exists public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('image', 'video', 'document')),
  bucket_name text not null check (bucket_name in ('project-gallery', 'approved-documents')),
  object_path text,
  video_url text,
  title_en text,
  title_ar text,
  title_it text,
  caption_en text,
  caption_ar text,
  caption_it text,
  alt_en text,
  alt_ar text,
  alt_it text,
  sort_order integer not null default 0,
  is_public_approved boolean not null default false,
  created_at timestamptz not null default now(),
  constraint media_path_or_video check (
    (kind = 'video' and video_url is not null and object_path is null)
    or (kind in ('image', 'document') and object_path is not null and video_url is null)
  ),
  constraint media_bucket_kind check (
    (kind = 'image' and bucket_name = 'project-gallery')
    or (kind = 'document' and bucket_name = 'approved-documents')
    or kind = 'video'
  )
);

create table if not exists public.project_awards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title_en text not null,
  title_ar text,
  title_it text,
  issuer_en text,
  issuer_ar text,
  issuer_it text,
  award_date date,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title_en text not null,
  title_ar text,
  title_it text,
  body_en text,
  body_ar text,
  body_it text,
  href text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content (
  key text primary key,
  content_en text not null default '',
  content_ar text not null default '',
  content_it text not null default '',
  is_visible boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.site_content (key, content_en, content_ar, content_it)
values
  ('home.hero_title', 'From Student Ideas to Future-Ready Innovations', 'من أفكار الطلاب إلى إنجازات تصنع المستقبل', 'Dalle idee degli studenti alle innovazioni del futuro'),
  ('home.hero_description', 'A home for the graduation projects, technical craft and collaborative work taking shape at Don Bosco Cairo Institute.', 'مساحة تعرض مشروعات التخرج والمهارات التقنية والعمل التعاوني في معهد دون بوسكو القاهرة.', 'Uno spazio dedicato ai progetti finali, alle competenze tecniche e al lavoro collaborativo dell’Istituto Don Bosco Cairo.'),
  ('home.industry_title', 'Technical work, ready to be discovered', 'أعمال تقنية تستحق الاكتشاف', 'Lavori tecnici da scoprire'),
  ('home.industry_description', 'Explore published student projects and use the form to ask the institute about a specific project. Follow-up is at the institute''s discretion.', 'تصفّح مشروعات الطلاب المنشورة واستخدم النموذج للاستفسار من المعهد عن مشروع محدد. ويعود قرار المتابعة إلى المعهد.', 'Esplora i progetti studenteschi pubblicati e usa il modulo per chiedere informazioni all’istituto su un progetto specifico. L’eventuale seguito è a discrezione dell’istituto.'),
  ('home.final_title', 'See what students are making', 'اكتشف ما يبتكره الطلاب', 'Scopri cosa stanno realizzando gli studenti'),
  ('home.final_description', 'Browse the project archive and discover the thinking, skills and teamwork behind each piece of work.', 'تصفح أرشيف المشروعات وتعرّف إلى الأفكار والمهارات والعمل الجماعي خلف كل مشروع.', 'Consulta l’archivio e scopri le idee, le competenze e il lavoro di squadra dietro ogni progetto.')
on conflict (key) do nothing;

create table if not exists public.statistics_config (
  id boolean primary key default true check (id = true),
  show_projects boolean not null default true,
  show_departments boolean not null default true,
  show_teams boolean not null default true,
  show_years boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.statistics_config (id) values (true) on conflict (id) do nothing;

create table if not exists public.project_views (
  project_id uuid not null references public.projects(id) on delete cascade,
  visitor_hash text not null check (visitor_hash ~ '^[a-f0-9]{64}$'),
  view_date date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (project_id, visitor_hash, view_date)
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  organization text not null check (char_length(organization) between 2 and 160),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  category text not null check (category in ('general', 'project', 'applied')),
  project_id uuid references public.projects(id) on delete set null,
  message text not null check (char_length(message) between 20 and 5000),
  consent boolean not null check (consent = true),
  status text not null default 'new' check (status in ('new', 'read', 'responded', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.inquiry_rate_limits (
  ip_hash text primary key check (ip_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.media_uploads (
  id uuid primary key default gen_random_uuid(),
  bucket_name text not null check (bucket_name in ('project-covers', 'project-gallery', 'department-images', 'team-images', 'approved-documents')),
  object_path text not null,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bucket_name, object_path)
);

create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists projects_publication_idx on public.projects (status, published_at desc);
create index if not exists projects_department_year_idx on public.projects (department_id, graduation_year);
create index if not exists projects_featured_idx on public.projects (featured, published_at desc) where status = 'published';
create index if not exists projects_views_idx on public.projects (views_count desc) where status = 'published';
create index if not exists projects_industry_idx on public.projects (industry_status, published_at desc) where status = 'published';
create index if not exists teams_public_idx on public.teams (status, is_public, created_at desc);
create index if not exists team_members_student_idx on public.team_members (student_id);
create index if not exists project_media_public_idx on public.project_media (project_id, is_public_approved, sort_order);
create index if not exists inquiries_created_idx on public.inquiries (created_at desc);
create index if not exists admin_activity_created_idx on public.admin_activity_logs (created_at desc);
create index if not exists media_uploads_stale_idx on public.media_uploads (claimed_at, created_at);

-- Keep `updated_at` consistent on records edited in the dashboard.
do $$
declare table_name text;
begin
  foreach table_name in array array['departments','students','teams','projects','announcements','site_content'] loop
    execute format('drop trigger if exists %I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create or replace function public.normalize_project_search(input_text text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare value_text text;
begin
  value_text := lower(coalesce(input_text, ''));
  value_text := translate(value_text, 'أإآٱ', 'اااا');
  value_text := replace(value_text, 'ى', 'ي');
  value_text := replace(value_text, 'ة', 'ه');
  value_text := replace(value_text, 'ـ', '');
  value_text := regexp_replace(value_text, '[ًٌٍَُِّْٰٓ]', '', 'g');
  return btrim(value_text);
end;
$$;

create or replace function public.search_published_projects(
  p_query text default null,
  p_locale text default 'en',
  p_department_slug text default null,
  p_graduation_year integer default null,
  p_category_slug text default null,
  p_featured boolean default null,
  p_awarded boolean default null,
  p_seeking_partner boolean default null,
  p_industry_only boolean default false,
  p_sort text default 'newest',
  p_page integer default 1,
  p_page_size integer default 12
)
returns table(project jsonb, total_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with input as (
    select nullif(public.normalize_project_search(p_query), '') as q,
           greatest(1, coalesce(p_page, 1)) as page_num,
           greatest(1, least(coalesce(p_page_size, 12), 24)) as page_size
  ),
  filtered as (
    select p.id as project_id, d.id as department_id, t.id as team_id
    from public.projects p
    join public.departments d on d.id = p.department_id and d.is_active = true
    left join public.teams t on t.id = p.team_id
    cross join input i
    where p.status = 'published'
      and (p_department_slug is null or d.slug = p_department_slug)
      and (p_graduation_year is null or p.graduation_year = p_graduation_year)
      and (p_featured is null or p.featured = p_featured)
      and (p_awarded is null or p.award_winning = p_awarded)
      and (p_seeking_partner is null or (p_seeking_partner = false or p.industry_status = 'seeking_partner'))
      and (not coalesce(p_industry_only, false) or p.industry_status <> 'none')
      and (p_category_slug is null or exists (
        select 1 from public.project_categories pc join public.categories c on c.id = pc.category_id
        where pc.project_id = p.id and c.slug = p_category_slug
      ))
      and (i.q is null or (
        position(i.q in public.normalize_project_search(p.title_en)) > 0
        or position(i.q in public.normalize_project_search(p.title_ar)) > 0
        or position(i.q in public.normalize_project_search(p.title_it)) > 0
        or position(i.q in public.normalize_project_search(p.short_description_en)) > 0
        or position(i.q in public.normalize_project_search(p.short_description_ar)) > 0
        or position(i.q in public.normalize_project_search(p.short_description_it)) > 0
        or position(i.q in public.normalize_project_search(p.description_en)) > 0
        or position(i.q in public.normalize_project_search(p.description_ar)) > 0
        or position(i.q in public.normalize_project_search(p.description_it)) > 0
        or position(i.q in public.normalize_project_search(p.problem_statement_en)) > 0
        or position(i.q in public.normalize_project_search(p.problem_statement_ar)) > 0
        or position(i.q in public.normalize_project_search(p.problem_statement_it)) > 0
        or position(i.q in public.normalize_project_search(t.name_en)) > 0
        or position(i.q in public.normalize_project_search(t.name_ar)) > 0
        or position(i.q in public.normalize_project_search(t.name_it)) > 0
        or exists (
          select 1 from public.project_tags pt join public.tags tag on tag.id = pt.tag_id
          where pt.project_id = p.id and (
            position(i.q in public.normalize_project_search(tag.label_en)) > 0
            or position(i.q in public.normalize_project_search(tag.label_ar)) > 0
            or position(i.q in public.normalize_project_search(tag.label_it)) > 0
          )
        )
        or exists (
          select 1 from public.teams team
          join public.team_members tm on tm.team_id = team.id
          join public.students s on s.id = tm.student_id and s.is_public_profile = true
          where team.id = p.team_id and (
            position(i.q in public.normalize_project_search(s.display_name_en)) > 0
            or position(i.q in public.normalize_project_search(s.display_name_ar)) > 0
            or position(i.q in public.normalize_project_search(s.display_name_it)) > 0
          )
        )
      ))
  )
  select
    (
      jsonb_build_object(
        'id', p.id, 'slug', p.slug,
        'title_en', p.title_en, 'title_ar', p.title_ar, 'title_it', p.title_it,
        'short_description_en', p.short_description_en, 'short_description_ar', p.short_description_ar, 'short_description_it', p.short_description_it,
        'description_en', p.description_en, 'description_ar', p.description_ar, 'description_it', p.description_it,
        'problem_statement_en', p.problem_statement_en, 'problem_statement_ar', p.problem_statement_ar, 'problem_statement_it', p.problem_statement_it,
        'objectives_en', p.objectives_en, 'objectives_ar', p.objectives_ar, 'objectives_it', p.objectives_it,
        'proposed_solution_en', p.proposed_solution_en, 'proposed_solution_ar', p.proposed_solution_ar, 'proposed_solution_it', p.proposed_solution_it,
        'technical_implementation_en', p.technical_implementation_en, 'technical_implementation_ar', p.technical_implementation_ar, 'technical_implementation_it', p.technical_implementation_it,
        'technical_specifications', p.technical_specifications,
        'academic_program_en', p.academic_program_en, 'academic_program_ar', p.academic_program_ar, 'academic_program_it', p.academic_program_it,
        'project_duration_en', p.project_duration_en, 'project_duration_ar', p.project_duration_ar, 'project_duration_it', p.project_duration_it
      )
      || jsonb_build_object(
        'department_id', p.department_id, 'team_id', p.team_id,
        'graduation_year', p.graduation_year, 'completion_date', p.completion_date,
        'status', p.status, 'featured', p.featured, 'award_winning', p.award_winning, 'industry_status', p.industry_status,
        'cover_image_path', p.cover_image_path, 'cover_alt_en', p.cover_alt_en, 'cover_alt_ar', p.cover_alt_ar, 'cover_alt_it', p.cover_alt_it,
        'views_count', p.views_count, 'published_at', p.published_at, 'created_at', p.created_at, 'updated_at', p.updated_at
      )
      || jsonb_build_object(
        'department', to_jsonb(d) - 'created_at' - 'updated_at',
        'team', case when t.id is null then null else
          (to_jsonb(t) - 'department_id' - 'is_public' - 'status' - 'created_at' - 'updated_at')
          || jsonb_build_object(
            'department', (select to_jsonb(td) - 'created_at' - 'updated_at' from public.departments td where td.id = t.department_id),
            'members', coalesce((
              select jsonb_agg((to_jsonb(s) - 'created_at' - 'updated_at' - 'is_public_profile') order by tm.display_order)
              from public.team_members tm
              join public.students s on s.id = tm.student_id and s.is_public_profile = true
              where tm.team_id = t.id
            ), '[]'::jsonb)
          )
        end
      )
      || jsonb_build_object(
        'tags', coalesce((select jsonb_agg(to_jsonb(tag) - 'created_at') from public.project_tags pt join public.tags tag on tag.id = pt.tag_id where pt.project_id = p.id), '[]'::jsonb),
        'categories', coalesce((select jsonb_agg(to_jsonb(c) - 'created_at') from public.project_categories pc join public.categories c on c.id = pc.category_id where pc.project_id = p.id), '[]'::jsonb)
      )
      || jsonb_build_object(
        'media', coalesce((select jsonb_agg(to_jsonb(m) - 'created_at' order by m.sort_order) from public.project_media m where m.project_id = p.id and m.is_public_approved = true), '[]'::jsonb),
        'awards', coalesce((select jsonb_agg(to_jsonb(a) - 'created_at' - 'project_id') from public.project_awards a where a.project_id = p.id and a.verified = true), '[]'::jsonb)
      )
    ) as project,
  count(*) over ()::bigint as total_count
  from filtered f
  join public.projects p on p.id = f.project_id
  join public.departments d on d.id = f.department_id
  left join public.teams t on t.id = f.team_id
  cross join input i
  order by
    case when p_sort = 'oldest' then p.published_at end asc nulls last,
    case when p_sort = 'alphabetical' and p_locale = 'ar' then lower(p.title_ar) end asc nulls last,
    case when p_sort = 'alphabetical' and p_locale = 'it' then lower(p.title_it) end asc nulls last,
    case when p_sort = 'alphabetical' and p_locale not in ('ar','it') then lower(p.title_en) end asc nulls last,
    case when p_sort = 'most_viewed' then p.views_count end desc nulls last,
    p.published_at desc nulls last, p.created_at desc
  limit (select page_size from input)
  offset ((select page_num from input) - 1) * (select page_size from input);
$$;

create or replace function public.get_project_facets()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'years', coalesce((select jsonb_agg(y.year order by y.year desc) from (select distinct graduation_year as year from public.projects where status = 'published') y), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('slug', c.slug, 'label_en', c.label_en, 'label_ar', c.label_ar, 'label_it', c.label_it) order by c.label_en) from public.categories c where exists (select 1 from public.project_categories pc join public.projects p on p.id = pc.project_id where pc.category_id = c.id and p.status = 'published')), '[]'::jsonb)
  );
$$;

create or replace function public.get_public_graduation_year_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(distinct graduation_year)::integer from public.projects where status = 'published';
$$;

create or replace function public.admin_list_projects(p_query text default null, p_status text default null, p_page integer default 1, p_page_size integer default 20)
returns table(project jsonb, total_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with input as (select nullif(public.normalize_project_search(p_query), '') as q, greatest(1, coalesce(p_page,1)) as page_num, greatest(1, least(coalesce(p_page_size,20),50)) as page_size),
  filtered as (
    select p from public.projects p cross join input i
    where public.is_project_admin()
      and (p_status is null or p.status = p_status)
      and (i.q is null or position(i.q in public.normalize_project_search(p.title_en)) > 0 or position(i.q in public.normalize_project_search(p.title_ar)) > 0 or position(i.q in public.normalize_project_search(p.title_it)) > 0 or position(i.q in public.normalize_project_search(p.slug)) > 0)
  )
  select (to_jsonb(p) - 'created_by') || jsonb_build_object('department', (select jsonb_build_object('id',d.id,'slug',d.slug,'name_en',d.name_en,'name_ar',d.name_ar,'name_it',d.name_it) from public.departments d where d.id=p.department_id)) as project,
         count(*) over()::bigint
  from filtered f join public.projects p on p.id=(f.p).id cross join input i
  order by p.updated_at desc
  limit (select page_size from input) offset ((select page_num from input)-1)*(select page_size from input);
$$;
revoke all on function public.admin_list_projects(text,text,integer,integer) from public, anon;
grant execute on function public.admin_list_projects(text,text,integer,integer) to authenticated;

create or replace function public.record_project_view(p_slug text, p_visitor_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare target_id uuid; inserted_rows integer;
begin
  if p_visitor_hash !~ '^[a-f0-9]{64}$' then return; end if;
  select id into target_id from public.projects where slug = p_slug and status = 'published';
  if target_id is null then return; end if;
  insert into public.project_views(project_id, visitor_hash, view_date)
  values(target_id, p_visitor_hash, current_date)
  on conflict do nothing;
  get diagnostics inserted_rows = row_count;
  if inserted_rows > 0 then update public.projects set views_count = views_count + 1 where id = target_id; end if;
end;
$$;
revoke all on function public.record_project_view(text,text) from public, anon, authenticated;
grant execute on function public.record_project_view(text,text) to service_role;

create or replace function public.submit_public_inquiry(
  p_organization text,
  p_contact_name text,
  p_email text,
  p_category text,
  p_project_id uuid,
  p_message text,
  p_ip_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare current_count integer; new_id uuid;
begin
  if p_ip_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_request'; end if;
  insert into public.inquiry_rate_limits(ip_hash, window_started_at, request_count)
  values(p_ip_hash, now(), 1)
  on conflict (ip_hash) do update set
    window_started_at = case when public.inquiry_rate_limits.window_started_at < now() - interval '10 minutes' then now() else public.inquiry_rate_limits.window_started_at end,
    request_count = case when public.inquiry_rate_limits.window_started_at < now() - interval '10 minutes' then 1 else public.inquiry_rate_limits.request_count + 1 end,
    updated_at = now()
  returning request_count into current_count;
  if current_count > 5 then raise exception 'rate_limited'; end if;
  if p_project_id is not null and not exists (select 1 from public.projects where id=p_project_id and status='published') then raise exception 'invalid_project'; end if;
  insert into public.inquiries(organization, contact_name, email, category, project_id, message, consent)
  values(btrim(p_organization), btrim(p_contact_name), lower(btrim(p_email)), p_category, p_project_id, btrim(p_message), true)
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.submit_public_inquiry(text,text,text,text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.submit_public_inquiry(text,text,text,text,uuid,text,text) to service_role;

-- Row-level security is the authority, not the frontend route visibility.
do $$
declare table_name text;
begin
  foreach table_name in array array['departments','students','teams','team_members','projects','tags','project_tags','categories','project_categories','project_media','project_awards','announcements','site_content','statistics_config','project_views','inquiries','inquiry_rate_limits','media_uploads','admin_activity_logs'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy "Public can read active departments" on public.departments for select to anon, authenticated using (is_active = true);
create policy "Administrators manage departments" on public.departments for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());

create policy "Public can read approved student profiles" on public.students for select to anon, authenticated using (is_public_profile = true);
create policy "Administrators manage student profiles" on public.students for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());

create policy "Public can read published public teams" on public.teams for select to anon, authenticated using (status = 'published' and is_public = true);
create policy "Administrators manage teams" on public.teams for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());

create policy "Public can read approved public team members" on public.team_members for select to anon, authenticated using (
  exists (select 1 from public.teams t where t.id = team_id and t.status = 'published' and t.is_public = true)
  and exists (select 1 from public.students s where s.id = student_id and s.is_public_profile = true)
);
create policy "Administrators manage team members" on public.team_members for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());

create policy "Public can read published projects" on public.projects for select to anon, authenticated using (status = 'published');
create policy "Administrators manage projects" on public.projects for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());

create policy "Public can read tags used by published projects" on public.tags for select to anon, authenticated using (
  exists (select 1 from public.project_tags pt join public.projects p on p.id=pt.project_id where pt.tag_id=tags.id and p.status='published')
);
create policy "Administrators manage tags" on public.tags for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());
create policy "Public can read project tags for published projects" on public.project_tags for select to anon, authenticated using (
  exists (select 1 from public.projects p where p.id=project_id and p.status='published')
);
create policy "Administrators manage project tags" on public.project_tags for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());

create policy "Public can read categories used by published projects" on public.categories for select to anon, authenticated using (
  exists (select 1 from public.project_categories pc join public.projects p on p.id=pc.project_id where pc.category_id=categories.id and p.status='published')
);
create policy "Administrators manage categories" on public.categories for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());
create policy "Public can read published project categories" on public.project_categories for select to anon, authenticated using (
  exists (select 1 from public.projects p where p.id=project_id and p.status='published')
);
create policy "Administrators manage project categories" on public.project_categories for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());

create policy "Public can read approved media for published projects" on public.project_media for select to anon, authenticated using (
  is_public_approved = true and exists (select 1 from public.projects p where p.id=project_id and p.status='published')
);
create policy "Administrators manage project media" on public.project_media for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());
create policy "Public can read verified awards for published projects" on public.project_awards for select to anon, authenticated using (
  verified = true and exists (select 1 from public.projects p where p.id=project_id and p.status='published')
);
create policy "Administrators manage project awards" on public.project_awards for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());

create policy "Public can read published announcements" on public.announcements for select to anon, authenticated using (is_published = true);
create policy "Administrators manage announcements" on public.announcements for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());
create policy "Public can read visible site content" on public.site_content for select to anon, authenticated using (is_visible = true);
create policy "Administrators manage site content" on public.site_content for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());
create policy "Public can read statistics visibility" on public.statistics_config for select to anon, authenticated using (id = true);
create policy "Administrators manage statistics visibility" on public.statistics_config for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());

create policy "Administrators view project analytics" on public.project_views for select to authenticated using (public.is_project_admin());
create policy "Administrators view inquiries" on public.inquiries for select to authenticated using (public.is_project_admin());
create policy "Administrators update inquiries" on public.inquiries for update to authenticated using (public.is_project_admin()) with check (public.is_project_admin());
create policy "Administrators delete inquiries" on public.inquiries for delete to authenticated using (public.is_project_admin());
create policy "Administrators manage rate limit records" on public.inquiry_rate_limits for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());
create policy "Administrators manage upload registry" on public.media_uploads for all to authenticated using (public.is_project_admin()) with check (public.is_project_admin());
create policy "Administrators view activity logs" on public.admin_activity_logs for select to authenticated using (public.is_project_admin());
create policy "Administrators write activity logs" on public.admin_activity_logs for insert to authenticated with check (public.is_project_admin() and admin_user_id = auth.uid());

-- Only the single allow-listed administrator can upload, replace or remove media.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-covers', 'project-covers', false, 8388608, array['image/jpeg','image/png','image/webp']),
  ('project-gallery', 'project-gallery', false, 8388608, array['image/jpeg','image/png','image/webp']),
  ('department-images', 'department-images', false, 8388608, array['image/jpeg','image/png','image/webp']),
  ('team-images', 'team-images', false, 8388608, array['image/jpeg','image/png','image/webp']),
  ('approved-documents', 'approved-documents', false, 12582912, array['application/pdf'])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Public read approved project image buckets" on storage.objects;
drop policy if exists "Administrators read institute media" on storage.objects;
create policy "Administrators read institute media" on storage.objects for select to authenticated using (public.is_project_admin() and bucket_id in ('project-covers','project-gallery','department-images','team-images','approved-documents'));
drop policy if exists "Administrators upload institute media" on storage.objects;
create policy "Administrators upload institute media" on storage.objects for insert to authenticated with check (public.is_project_admin() and bucket_id in ('project-covers','project-gallery','department-images','team-images','approved-documents'));
drop policy if exists "Administrators update institute media" on storage.objects;
create policy "Administrators update institute media" on storage.objects for update to authenticated using (public.is_project_admin() and bucket_id in ('project-covers','project-gallery','department-images','team-images','approved-documents')) with check (public.is_project_admin() and bucket_id in ('project-covers','project-gallery','department-images','team-images','approved-documents'));
drop policy if exists "Administrators delete institute media" on storage.objects;
create policy "Administrators delete institute media" on storage.objects for delete to authenticated using (public.is_project_admin() and bucket_id in ('project-covers','project-gallery','department-images','team-images','approved-documents'));
