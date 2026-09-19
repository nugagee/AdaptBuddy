-- Live online presence for admin activity analytics.
-- "Online" = session with last_activity_at within the configured window
-- (heartbeats refresh this every ~15s while a tab is open).

create or replace function public.admin_get_online_presence(
  p_within_seconds integer default 120
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_seconds integer;
  v_window interval;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  v_seconds := greatest(least(coalesce(p_within_seconds, 120), 900), 30);
  v_window := make_interval(secs => v_seconds);

  with live as (
    select
      s.id as session_id,
      s.visitor_id,
      s.user_id,
      coalesce(s.user_role, p.role::text, case when s.is_guest then 'guest' else 'visitor' end) as role,
      s.is_guest,
      s.started_at,
      s.last_activity_at,
      s.page_count,
      s.duration_ms,
      s.entry_path,
      coalesce(pv.path, s.exit_path) as current_path,
      pv.path_group as current_path_group,
      pv.title as current_title,
      pv.active_ms as current_page_active_ms,
      pv.entered_at as current_page_entered_at,
      s.viewport_width,
      s.viewport_height,
      s.timezone,
      v.visitor_key,
      p.email,
      coalesce(nullif(trim(p.full_name), ''), nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email) as display_name,
      greatest(0, (extract(epoch from (now() - s.last_activity_at)))::int) as seconds_since_activity
    from public.analytics_sessions s
    join public.analytics_visitors v on v.id = s.visitor_id
    left join public.profiles p on p.id = s.user_id
    left join lateral (
      select pv2.title, pv2.path, pv2.path_group, pv2.active_ms, pv2.entered_at
      from public.analytics_page_views pv2
      where pv2.session_id = s.id
      order by pv2.entered_at desc
      limit 1
    ) pv on true
    where s.last_activity_at >= now() - v_window
  )
  select jsonb_build_object(
    'as_of', now(),
    'within_seconds', v_seconds,
    'online_sessions', (select count(*)::int from live),
    'online_users', (select count(distinct user_id)::int from live where user_id is not null),
    'online_anonymous', (select count(*)::int from live where user_id is null),
    'by_role', coalesce((
      select jsonb_object_agg(role_key, role_count)
      from (
        select role as role_key, count(*)::int as role_count
        from live
        group by role
      ) r
    ), '{}'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(row_to_json(l)::jsonb order by l.last_activity_at desc)
      from live l
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_get_online_presence(integer) from public;
grant execute on function public.admin_get_online_presence(integer) to authenticated;
