-- Ebook preview + private PDF bucket (additive part, deploy step 1).
-- Safe to apply before the code deploy: nothing existing is removed or tightened.
-- The policy tightening lives in 20260929_ebook_storage_lockdown.sql (deploy step 5).

do $$
begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'public.is_admin() is required but does not exist';
  end if;
end
$$;

-- 0 = no preview. Stays below 2 when the PDF has fewer pages.
alter table public.ebooks_metadata
  add column if not exists preview_pages smallint not null default 0;

-- Private bucket for full ebook PDFs. Buyers only ever receive short-lived signed URLs.
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('ebook-pdfs', 'ebook-pdfs', false, array['application/pdf'])
on conflict (id) do update set public = false;

drop policy if exists "ebook-pdfs admin select" on storage.objects;
create policy "ebook-pdfs admin select" on storage.objects
  for select to authenticated
  using (bucket_id = 'ebook-pdfs' and public.is_admin());

drop policy if exists "ebook-pdfs admin insert" on storage.objects;
create policy "ebook-pdfs admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ebook-pdfs' and public.is_admin());

drop policy if exists "ebook-pdfs admin update" on storage.objects;
create policy "ebook-pdfs admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'ebook-pdfs' and public.is_admin())
  with check (bucket_id = 'ebook-pdfs' and public.is_admin());

drop policy if exists "ebook-pdfs admin delete" on storage.objects;
create policy "ebook-pdfs admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ebook-pdfs' and public.is_admin());
