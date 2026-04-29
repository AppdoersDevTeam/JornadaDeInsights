create index if not exists idx_site_page_views_created_path
  on public.site_page_views (created_at desc, page_path);

create index if not exists idx_site_page_views_created_country
  on public.site_page_views (created_at desc, country);

create index if not exists idx_site_page_views_created_visitor
  on public.site_page_views (created_at desc, visitor_id);

create or replace function public.get_site_analytics_summary(window_days integer default 30)
returns jsonb
language sql
stable
as $$
with params as (
  select greatest(1, least(coalesce(window_days, 30), 90)) as days
),
range_start as (
  select now() - make_interval(days => (select days from params)) as since_ts
),
filtered as (
  select created_at, page_path, country, visitor_id
  from public.site_page_views
  where created_at >= (select since_ts from range_start)
),
page_counts as (
  select coalesce(page_path, '/') as page, count(*)::int as views
  from filtered
  group by coalesce(page_path, '/')
  order by views desc
  limit 8
),
country_counts as (
  select coalesce(country, 'Unknown') as country, count(*)::int as views
  from filtered
  group by coalesce(country, 'Unknown')
  order by views desc
  limit 8
),
daily_counts as (
  select date_trunc('day', created_at)::date as day, count(*)::int as views
  from filtered
  group by date_trunc('day', created_at)::date
),
series as (
  select generate_series(
    current_date - ((select days from params) - 1),
    current_date,
    interval '1 day'
  )::date as day
)
select jsonb_build_object(
  'totalPageViews', (select count(*)::int from filtered),
  'uniqueVisitors', (select count(distinct visitor_id)::int from filtered),
  'topPages', coalesce(
    (select jsonb_agg(jsonb_build_object('page', page, 'views', views)) from page_counts),
    '[]'::jsonb
  ),
  'topCountries', coalesce(
    (select jsonb_agg(jsonb_build_object('country', country, 'views', views)) from country_counts),
    '[]'::jsonb
  ),
  'dailyViews', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'date', to_char(series.day, 'YYYY-MM-DD'),
          'views', coalesce(daily_counts.views, 0)
        )
        order by series.day
      )
      from series
      left join daily_counts on daily_counts.day = series.day
    ),
    '[]'::jsonb
  ),
  'windowDays', (select days from params)
);
$$;

revoke all on function public.get_site_analytics_summary(integer) from public, anon, authenticated;
grant execute on function public.get_site_analytics_summary(integer) to service_role;
