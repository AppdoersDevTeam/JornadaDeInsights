create index if not exists idx_site_page_views_created_referrer
  on public.site_page_views (created_at desc, referrer);

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
  select created_at, page_path, country, visitor_id, referrer, user_agent
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
referrer_counts as (
  select
    coalesce(nullif(referrer, ''), 'Direct') as referrer,
    count(*)::int as views
  from filtered
  group by coalesce(nullif(referrer, ''), 'Direct')
  order by views desc
  limit 8
),
device_counts as (
  select
    (
      case
        when user_agent is null or user_agent = '' then 'Unknown'
        when user_agent ilike '%ipad%' or user_agent ilike '%tablet%' then 'Tablet'
        when user_agent ilike '%mobi%' or user_agent ilike '%iphone%' or user_agent ilike '%android%' then 'Mobile'
        else 'Desktop'
      end
    ) as device,
    count(*)::int as views
  from filtered
  group by 1
  order by views desc
  limit 8
),
os_counts as (
  select
    (
      case
        when user_agent is null or user_agent = '' then 'Unknown'
        when user_agent ilike '%windows%' then 'Windows'
        when user_agent ilike '%android%' then 'Android'
        when user_agent ilike '%iphone%' or user_agent ilike '%ipad%' or user_agent ilike '%ios%' then 'iOS'
        when user_agent ilike '%mac os x%' or user_agent ilike '%macintosh%' then 'macOS'
        when user_agent ilike '%cros%' then 'ChromeOS'
        when user_agent ilike '%linux%' then 'Linux'
        else 'Other'
      end
    ) as os,
    count(*)::int as views
  from filtered
  group by 1
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
  'topReferrers', coalesce(
    (select jsonb_agg(jsonb_build_object('referrer', referrer, 'views', views)) from referrer_counts),
    '[]'::jsonb
  ),
  'topDevices', coalesce(
    (select jsonb_agg(jsonb_build_object('device', device, 'views', views)) from device_counts),
    '[]'::jsonb
  ),
  'topOperatingSystems', coalesce(
    (select jsonb_agg(jsonb_build_object('os', os, 'views', views)) from os_counts),
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

