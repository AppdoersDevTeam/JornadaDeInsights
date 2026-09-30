-- Storage + ebooks_metadata lockdown (deploy step 5).
-- Apply only after: PDFs copied to ebook-pdfs, new code deployed, previews generated.
-- Existing policy names vary between environments, so every policy touching the
-- target is dropped by lookup and replaced with an explicit set.

do $$
begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'public.is_admin() is required but does not exist';
  end if;
end
$$;

-- store-assets: public read stays (covers, previews, curiosidades media); writes are admin-only.
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (coalesce(qual, '') ilike '%store-assets%' or coalesce(with_check, '') ilike '%store-assets%')
  loop
    raise notice 'dropping storage.objects policy: %', pol.policyname;
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end
$$;

create policy "store-assets public select" on storage.objects
  for select to public
  using (bucket_id = 'store-assets');

create policy "store-assets admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'store-assets' and public.is_admin());

create policy "store-assets admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'store-assets' and public.is_admin())
  with check (bucket_id = 'store-assets' and public.is_admin());

create policy "store-assets admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'store-assets' and public.is_admin());

-- ebooks_metadata: public read stays; writes (including price, read at checkout) are admin-only.
alter table public.ebooks_metadata enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ebooks_metadata'
  loop
    raise notice 'dropping ebooks_metadata policy: %', pol.policyname;
    execute format('drop policy %I on public.ebooks_metadata', pol.policyname);
  end loop;
end
$$;

create policy "ebooks_metadata public select" on public.ebooks_metadata
  for select to public
  using (true);

create policy "ebooks_metadata admin insert" on public.ebooks_metadata
  for insert to authenticated
  with check (public.is_admin());

create policy "ebooks_metadata admin update" on public.ebooks_metadata
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "ebooks_metadata admin delete" on public.ebooks_metadata
  for delete to authenticated
  using (public.is_admin());
