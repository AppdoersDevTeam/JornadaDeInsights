alter table public.site_page_views
  add column if not exists tz_offset_minutes integer;

alter table public.site_page_views
  add constraint site_page_views_path_len_chk check (char_length(page_path) <= 512),
  add constraint site_page_views_url_len_chk check (page_url is null or char_length(page_url) <= 1024),
  add constraint site_page_views_referrer_len_chk check (referrer is null or char_length(referrer) <= 1024),
  add constraint site_page_views_visitor_len_chk check (char_length(visitor_id) <= 128),
  add constraint site_page_views_session_len_chk check (char_length(session_id) <= 128);

revoke all on table public.site_page_views from anon, authenticated;
grant select, insert on table public.site_page_views to service_role;

drop policy if exists "deny anon/authenticated site_page_views reads" on public.site_page_views;
create policy "deny anon/authenticated site_page_views reads"
  on public.site_page_views
  for select
  to anon, authenticated
  using (false);

drop policy if exists "deny anon/authenticated site_page_views writes" on public.site_page_views;
create policy "deny anon/authenticated site_page_views writes"
  on public.site_page_views
  for insert
  to anon, authenticated
  with check (false);
