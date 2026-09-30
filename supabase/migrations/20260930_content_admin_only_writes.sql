-- Content tables: public read stays; insert/update/delete become admin-only.
-- Before this, any caller with the anon key could rewrite categories and curiosidades.
--
-- Rollback (re-creates the previous open policies):
--   for t in categories, curiosidades, curiosidades_categories:
--     drop policy "<t> admin insert|update|delete" on public.<t>;
--     create policy "Authenticated users can insert <t>" on public.<t> for insert with check (true);
--     create policy "Authenticated users can update <t>" on public.<t> for update using (true) with check (true);
--     create policy "Authenticated users can delete <t>" on public.<t> for delete using (true);

do $$
begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'public.is_admin() is required but does not exist';
  end if;
end
$$;

do $$
declare
  t text;
  pol record;
begin
  foreach t in array array['categories', 'curiosidades', 'curiosidades_categories'] loop
    execute format('alter table public.%I enable row level security', t);

    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = t
        and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    loop
      raise notice 'dropping %.% policy: %', 'public', t, pol.policyname;
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_admin())',
      t || ' admin insert', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || ' admin update', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_admin())',
      t || ' admin delete', t
    );
  end loop;
end
$$;
