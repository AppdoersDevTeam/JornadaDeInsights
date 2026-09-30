-- Courses (additive). Video IDs live only in service-role tables; the public
-- catalog never exposes them.
--
-- Rollback:
--   drop table if exists public.course_access_log, public.course_lessons,
--     public.course_private, public.courses;
--   drop index if exists purchases_session_product_uidx, purchases_product_idx;
--   alter table public.purchases drop column if exists product_type, drop column if exists product_id;

do $$
begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'public.is_admin() is required but does not exist';
  end if;
end
$$;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  subtitle text,
  description text,
  learn_points jsonb not null default '[]'::jsonb,
  price numeric(10, 2) not null check (price > 0),
  cover_filename text,
  preview_youtube_id text,
  content_locale text not null default 'pt-BR' check (content_locale in ('pt-BR', 'en')),
  category_id uuid references public.categories (id) on delete set null,
  lesson_count integer not null default 0,
  total_duration_seconds integer not null default 0,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

-- anon cannot execute is_admin(), so the admin read is a separate authenticated policy.
drop policy if exists "courses public select" on public.courses;
create policy "courses public select" on public.courses
  for select to public
  using (is_published);

drop policy if exists "courses admin select" on public.courses;
create policy "courses admin select" on public.courses
  for select to authenticated
  using (public.is_admin());

drop policy if exists "courses admin insert" on public.courses;
create policy "courses admin insert" on public.courses
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "courses admin update" on public.courses;
create policy "courses admin update" on public.courses
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Buyers keep seeing a course they own even after it is unpublished.
create or replace function public.owns_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.purchases
    where product_type = 'course'
      and product_id = p_course_id
      and lower(customer_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$fn$;

revoke execute on function public.owns_course(uuid) from public, anon;
grant execute on function public.owns_course(uuid) to authenticated;

drop policy if exists "courses owner select" on public.courses;
create policy "courses owner select" on public.courses
  for select to authenticated
  using (public.owns_course(id));

-- No client delete policy: deletes go through admin.js?action=course-delete, which
-- refuses when the course has purchases.
drop policy if exists "courses admin delete" on public.courses;

-- Service-role only (RLS on, no policies).
create table if not exists public.course_private (
  course_id uuid primary key references public.courses (id) on delete cascade,
  youtube_playlist_url text,
  youtube_playlist_id text,
  last_synced_at timestamptz
);
alter table public.course_private enable row level security;

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position integer not null,
  title text not null,
  duration_seconds integer not null default 0,
  youtube_video_id text not null,
  unique (course_id, position)
);
alter table public.course_lessons enable row level security;

create table if not exists public.course_access_log (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid references public.course_lessons (id) on delete set null,
  user_id uuid,
  user_email text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.course_access_log enable row level security;

create index if not exists course_access_log_course_created_idx
  on public.course_access_log (course_id, created_at desc);

-- Defense in depth: the API roles get no table access at all to the service-only tables.
revoke all on table public.course_private, public.course_lessons, public.course_access_log from anon, authenticated;

-- Purchases: generic product columns. The existing unique(session_id, ebook_id) stays
-- so the ebook upsert keeps working; courses get their own unique key.
alter table public.purchases add column if not exists product_type text not null default 'ebook'
  check (product_type in ('ebook', 'course'));
alter table public.purchases add column if not exists product_id uuid;

update public.purchases
set product_id = ebook_id
where product_type = 'ebook' and product_id is null and ebook_id is not null;

create unique index if not exists purchases_session_product_uidx
  on public.purchases (session_id, product_type, product_id);

create index if not exists purchases_product_idx
  on public.purchases (product_type, product_id);

do $$
begin
  if to_regprocedure('public.update_updated_at_column()') is not null then
    drop trigger if exists courses_updated_at on public.courses;
    create trigger courses_updated_at
      before update on public.courses
      for each row execute function public.update_updated_at_column();
  end if;
end
$$;
