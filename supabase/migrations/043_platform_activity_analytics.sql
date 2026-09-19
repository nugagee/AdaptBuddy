-- First-party platform activity analytics (sessions, page views, visitor keys).
-- Tracks navigation + time-on-page only — never form fields or private child content.
-- Writes go through security-definer RPCs; reads are admin-only.

create extension if not exists pgcrypto;

create table if not exists public.analytics_visitors (
  id uuid primary key default gen_random_uuid(),
  visitor_key text not null unique,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.analytics_visitors(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  user_role text,
  is_guest boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_activity_at timestamptz not null default now(),
  entry_path text,
  exit_path text,
  page_count integer not null default 0,
  duration_ms bigint not null default 0,
  referrer text,
  viewport_width integer,
  viewport_height integer,
  timezone text,
  created_at timestamptz not null default now(),
  constraint analytics_sessions_role_check
    check (user_role is null or user_role in ('child', 'parent', 'teacher', 'admin', 'guest', 'visitor'))
);

create table if not exists public.analytics_page_views (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.analytics_sessions(id) on delete cascade,
  visitor_id uuid not null references public.analytics_visitors(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  path text not null,
  path_group text not null,
  title text,
  sequence_no integer not null default 1,
  entered_at timestamptz not null default now(),
  exited_at timestamptz,
  duration_ms bigint not null default 0,
  active_ms bigint not null default 0,
  referrer_path text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_sessions_started_idx
  on public.analytics_sessions (started_at desc);

create index if not exists analytics_sessions_user_started_idx
  on public.analytics_sessions (user_id, started_at desc);

create index if not exists analytics_sessions_visitor_started_idx
  on public.analytics_sessions (visitor_id, started_at desc);

create index if not exists analytics_page_views_entered_idx
  on public.analytics_page_views (entered_at desc);

create index if not exists analytics_page_views_path_entered_idx
  on public.analytics_page_views (path_group, entered_at desc);

create index if not exists analytics_page_views_session_seq_idx
  on public.analytics_page_views (session_id, sequence_no);

create index if not exists analytics_page_views_user_entered_idx
  on public.analytics_page_views (user_id, entered_at desc);

alter table public.analytics_visitors enable row level security;
alter table public.analytics_sessions enable row level security;
alter table public.analytics_page_views enable row level security;

drop policy if exists "Admins can view analytics visitors" on public.analytics_visitors;
create policy "Admins can view analytics visitors"
  on public.analytics_visitors for select
  using (public.is_admin());

drop policy if exists "Admins can view analytics sessions" on public.analytics_sessions;
create policy "Admins can view analytics sessions"
  on public.analytics_sessions for select
  using (public.is_admin());

drop policy if exists "Admins can view analytics page views" on public.analytics_page_views;
create policy "Admins can view analytics page views"
  on public.analytics_page_views for select
  using (public.is_admin());

-- Write path: security definer RPCs (no direct client inserts).

create or replace function public.analytics_upsert_visitor(
  p_visitor_key text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_id uuid;
begin
  if p_visitor_key is null or length(trim(p_visitor_key)) < 8 then
    raise exception 'Invalid visitor key';
  end if;

  insert into public.analytics_visitors (visitor_key, user_agent, last_seen_at)
  values (trim(p_visitor_key), left(coalesce(p_user_agent, ''), 512), now())
  on conflict (visitor_key) do update
    set last_seen_at = now(),
        user_agent = coalesce(excluded.user_agent, public.analytics_visitors.user_agent)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.analytics_start_session(
  p_visitor_key text,
  p_entry_path text default '/',
  p_referrer text default null,
  p_user_role text default null,
  p_is_guest boolean default false,
  p_viewport_width integer default null,
  p_viewport_height integer default null,
  p_timezone text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_visitor_id uuid;
  v_session_id uuid;
  v_role text;
begin
  v_visitor_id := public.analytics_upsert_visitor(p_visitor_key, p_user_agent);

  v_role := case
    when auth.uid() is not null and p_is_guest is not true then
      coalesce(
        (select role::text from public.profiles where id = auth.uid()),
        nullif(p_user_role, ''),
        'visitor'
      )
    when p_is_guest then 'guest'
    else coalesce(nullif(p_user_role, ''), 'visitor')
  end;

  insert into public.analytics_sessions (
    visitor_id,
    user_id,
    user_role,
    is_guest,
    entry_path,
    referrer,
    viewport_width,
    viewport_height,
    timezone
  )
  values (
    v_visitor_id,
    case when p_is_guest then null else auth.uid() end,
    v_role,
    coalesce(p_is_guest, false),
    left(coalesce(nullif(trim(p_entry_path), ''), '/'), 512),
    left(nullif(trim(p_referrer), ''), 1024),
    p_viewport_width,
    p_viewport_height,
    left(nullif(trim(p_timezone), ''), 64)
  )
  returning id into v_session_id;

  return v_session_id;
end;
$$;

create or replace function public.analytics_record_page_view(
  p_session_id uuid,
  p_visitor_key text,
  p_path text,
  p_path_group text,
  p_title text default null,
  p_referrer_path text default null,
  p_sequence_no integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_session public.analytics_sessions%rowtype;
  v_visitor_id uuid;
  v_page_id uuid;
begin
  if p_session_id is null then
    raise exception 'Missing session';
  end if;

  select * into v_session
  from public.analytics_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Unknown session';
  end if;

  v_visitor_id := public.analytics_upsert_visitor(p_visitor_key, null);
  if v_session.visitor_id <> v_visitor_id then
    raise exception 'Session visitor mismatch';
  end if;

  -- Close previous open page view in this session.
  update public.analytics_page_views
  set exited_at = coalesce(exited_at, now()),
      duration_ms = greatest(
        duration_ms,
        (extract(epoch from (now() - entered_at)) * 1000)::bigint
      )
  where session_id = p_session_id
    and exited_at is null;

  insert into public.analytics_page_views (
    session_id,
    visitor_id,
    user_id,
    path,
    path_group,
    title,
    sequence_no,
    referrer_path
  )
  values (
    p_session_id,
    v_visitor_id,
    v_session.user_id,
    left(coalesce(nullif(trim(p_path), ''), '/'), 512),
    left(coalesce(nullif(trim(p_path_group), ''), '/'), 512),
    left(nullif(trim(p_title), ''), 256),
    greatest(coalesce(p_sequence_no, 1), 1),
    left(nullif(trim(p_referrer_path), ''), 512)
  )
  returning id into v_page_id;

  update public.analytics_sessions
  set page_count = page_count + 1,
      last_activity_at = now(),
      exit_path = left(coalesce(nullif(trim(p_path), ''), '/'), 512),
      user_id = coalesce(user_id, case when is_guest then null else auth.uid() end),
      user_role = case
        when auth.uid() is not null and is_guest is not true then
          coalesce(
            (select role::text from public.profiles where id = auth.uid()),
            user_role
          )
        else user_role
      end
  where id = p_session_id;

  return v_page_id;
end;
$$;

create or replace function public.analytics_heartbeat_page(
  p_page_view_id uuid,
  p_visitor_key text,
  p_active_ms_delta bigint default 0
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_visitor_id uuid;
  v_page public.analytics_page_views%rowtype;
begin
  if p_page_view_id is null then
    return;
  end if;

  v_visitor_id := public.analytics_upsert_visitor(p_visitor_key, null);

  select * into v_page
  from public.analytics_page_views
  where id = p_page_view_id;

  if not found or v_page.visitor_id <> v_visitor_id then
    return;
  end if;

  update public.analytics_page_views
  set active_ms = active_ms + greatest(coalesce(p_active_ms_delta, 0), 0),
      duration_ms = greatest(
        duration_ms,
        (extract(epoch from (now() - entered_at)) * 1000)::bigint
      )
  where id = p_page_view_id
    and exited_at is null;

  update public.analytics_sessions
  set last_activity_at = now(),
      duration_ms = greatest(
        duration_ms,
        (extract(epoch from (now() - started_at)) * 1000)::bigint
      )
  where id = v_page.session_id;
end;
$$;

create or replace function public.analytics_end_page_view(
  p_page_view_id uuid,
  p_visitor_key text,
  p_active_ms bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_visitor_id uuid;
  v_page public.analytics_page_views%rowtype;
begin
  if p_page_view_id is null then
    return;
  end if;

  v_visitor_id := public.analytics_upsert_visitor(p_visitor_key, null);

  select * into v_page
  from public.analytics_page_views
  where id = p_page_view_id;

  if not found or v_page.visitor_id <> v_visitor_id then
    return;
  end if;

  update public.analytics_page_views
  set exited_at = coalesce(exited_at, now()),
      active_ms = greatest(coalesce(p_active_ms, active_ms), active_ms),
      duration_ms = greatest(
        duration_ms,
        (extract(epoch from (now() - entered_at)) * 1000)::bigint
      )
  where id = p_page_view_id;

  update public.analytics_sessions
  set last_activity_at = now(),
      exit_path = v_page.path,
      duration_ms = greatest(
        duration_ms,
        (extract(epoch from (now() - started_at)) * 1000)::bigint
      )
  where id = v_page.session_id;
end;
$$;

create or replace function public.analytics_end_session(
  p_session_id uuid,
  p_visitor_key text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_visitor_id uuid;
begin
  if p_session_id is null then
    return;
  end if;

  v_visitor_id := public.analytics_upsert_visitor(p_visitor_key, null);

  update public.analytics_page_views
  set exited_at = coalesce(exited_at, now()),
      duration_ms = greatest(
        duration_ms,
        (extract(epoch from (now() - entered_at)) * 1000)::bigint
      )
  where session_id = p_session_id
    and visitor_id = v_visitor_id
    and exited_at is null;

  update public.analytics_sessions
  set ended_at = coalesce(ended_at, now()),
      last_activity_at = now(),
      duration_ms = greatest(
        duration_ms,
        (extract(epoch from (now() - started_at)) * 1000)::bigint
      )
  where id = p_session_id
    and visitor_id = v_visitor_id;
end;
$$;

revoke all on function public.analytics_upsert_visitor(text, text) from public;
revoke all on function public.analytics_start_session(text, text, text, text, boolean, integer, integer, text, text) from public;
revoke all on function public.analytics_record_page_view(uuid, text, text, text, text, text, integer) from public;
revoke all on function public.analytics_heartbeat_page(uuid, text, bigint) from public;
revoke all on function public.analytics_end_page_view(uuid, text, bigint) from public;
revoke all on function public.analytics_end_session(uuid, text) from public;

grant execute on function public.analytics_upsert_visitor(text, text) to anon, authenticated;
grant execute on function public.analytics_start_session(text, text, text, text, boolean, integer, integer, text, text) to anon, authenticated;
grant execute on function public.analytics_record_page_view(uuid, text, text, text, text, text, integer) to anon, authenticated;
grant execute on function public.analytics_heartbeat_page(uuid, text, bigint) to anon, authenticated;
grant execute on function public.analytics_end_page_view(uuid, text, bigint) to anon, authenticated;
grant execute on function public.analytics_end_session(uuid, text) to anon, authenticated;

-- Admin read RPCs

create or replace function public.admin_get_activity_overview(
  p_granularity text default 'day',
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_bucket text;
  v_result jsonb;
  v_fmt text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  v_bucket := case lower(coalesce(p_granularity, 'day'))
    when 'hour' then 'hour'
    when 'week' then 'week'
    when 'month' then 'month'
    when 'year' then 'year'
    else 'day'
  end;

  v_fmt := case v_bucket
    when 'hour' then 'YYYY-MM-DD"T"HH24":00:00"Z'
    when 'week' then 'IYYY-"W"IW'
    when 'month' then 'YYYY-MM'
    when 'year' then 'YYYY'
    else 'YYYY-MM-DD'
  end;

  with bounds as (
    select p_from as range_from, p_to as range_to
  ),
  session_stats as (
    select
      count(*)::int as sessions,
      count(distinct visitor_id)::int as unique_visitors,
      count(distinct user_id) filter (where user_id is not null)::int as unique_users,
      coalesce(avg(nullif(duration_ms, 0)), 0)::bigint as avg_session_ms
    from public.analytics_sessions s, bounds b
    where s.started_at >= b.range_from
      and s.started_at < b.range_to
  ),
  page_stats as (
    select
      count(*)::int as page_views,
      coalesce(avg(nullif(active_ms, 0)), 0)::bigint as avg_active_ms,
      coalesce(avg(nullif(duration_ms, 0)), 0)::bigint as avg_duration_ms
    from public.analytics_page_views pv, bounds b
    where pv.entered_at >= b.range_from
      and pv.entered_at < b.range_to
  ),
  role_breakdown as (
    select coalesce(jsonb_object_agg(role_key, role_count), '{}'::jsonb) as by_role
    from (
      select coalesce(user_role, 'visitor') as role_key, count(*)::int as role_count
      from public.analytics_sessions s, bounds b
      where s.started_at >= b.range_from
        and s.started_at < b.range_to
      group by 1
    ) roles
  ),
  series as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'bucket', to_char(bucket_start at time zone 'UTC', v_fmt),
      'sessions', sessions,
      'page_views', page_views,
      'unique_visitors', unique_visitors,
      'unique_users', unique_users
    ) order by bucket_start), '[]'::jsonb) as timeline
    from (
      select
        date_trunc(v_bucket, s.started_at) as bucket_start,
        count(*)::int as sessions,
        coalesce(sum(s.page_count), 0)::int as page_views,
        count(distinct s.visitor_id)::int as unique_visitors,
        count(distinct s.user_id) filter (where s.user_id is not null)::int as unique_users
      from public.analytics_sessions s, bounds b
      where s.started_at >= b.range_from
        and s.started_at < b.range_to
      group by 1
    ) buckets
  )
  select jsonb_build_object(
    'granularity', v_bucket,
    'from', p_from,
    'to', p_to,
    'sessions', (select sessions from session_stats),
    'unique_visitors', (select unique_visitors from session_stats),
    'unique_users', (select unique_users from session_stats),
    'page_views', (select page_views from page_stats),
    'avg_session_ms', (select avg_session_ms from session_stats),
    'avg_active_ms', (select avg_active_ms from page_stats),
    'avg_page_duration_ms', (select avg_duration_ms from page_stats),
    'by_role', (select by_role from role_breakdown),
    'timeline', (select timeline from series)
  )
  into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_get_top_pages(
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now(),
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb)
    from (
      select
        path_group,
        count(*)::int as views,
        count(distinct session_id)::int as sessions,
        count(distinct visitor_id)::int as visitors,
        coalesce(avg(nullif(active_ms, 0)), 0)::bigint as avg_active_ms,
        coalesce(avg(nullif(duration_ms, 0)), 0)::bigint as avg_duration_ms,
        coalesce(sum(active_ms), 0)::bigint as total_active_ms
      from public.analytics_page_views
      where entered_at >= p_from
        and entered_at < p_to
      group by path_group
      order by views desc
      limit greatest(least(coalesce(p_limit, 20), 100), 1)
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_top_users(
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now(),
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb)
    from (
      select
        s.user_id,
        p.email,
        coalesce(nullif(p.full_name, ''), concat_ws(' ', p.first_name, p.last_name), p.email) as display_name,
        coalesce(s.user_role, p.role::text, 'visitor') as role,
        count(*)::int as sessions,
        coalesce(sum(s.page_count), 0)::int as page_views,
        coalesce(sum(s.duration_ms), 0)::bigint as total_duration_ms,
        max(s.started_at) as last_seen_at
      from public.analytics_sessions s
      left join public.profiles p on p.id = s.user_id
      where s.started_at >= p_from
        and s.started_at < p_to
        and s.user_id is not null
      group by s.user_id, p.email, p.full_name, p.first_name, p.last_name, p.role, s.user_role
      order by sessions desc, page_views desc
      limit greatest(least(coalesce(p_limit, 20), 100), 1)
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_top_visitors(
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now(),
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb)
    from (
      select
        s.visitor_id,
        v.visitor_key,
        (array_agg(s.user_id order by s.started_at desc) filter (where s.user_id is not null))[1] as user_id,
        max(p.email) as email,
        max(coalesce(nullif(p.full_name, ''), concat_ws(' ', p.first_name, p.last_name), p.email)) as display_name,
        max(coalesce(s.user_role, p.role::text, 'visitor')) as role,
        count(*)::int as sessions,
        coalesce(sum(s.page_count), 0)::int as page_views,
        coalesce(sum(s.duration_ms), 0)::bigint as total_duration_ms,
        max(s.started_at) as last_seen_at
      from public.analytics_sessions s
      join public.analytics_visitors v on v.id = s.visitor_id
      left join public.profiles p on p.id = s.user_id
      where s.started_at >= p_from
        and s.started_at < p_to
      group by s.visitor_id, v.visitor_key
      order by sessions desc, page_views desc
      limit greatest(least(coalesce(p_limit, 20), 100), 1)
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_user_journey(
  p_user_id uuid default null,
  p_visitor_id uuid default null,
  p_from timestamptz default (now() - interval '30 days'),
  p_to timestamptz default now(),
  p_limit integer default 200
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_profile jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_user_id is null and p_visitor_id is null then
    raise exception 'user_id or visitor_id required';
  end if;

  if p_user_id is not null then
    select jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'display_name', coalesce(nullif(p.full_name, ''), concat_ws(' ', p.first_name, p.last_name), p.email),
      'role', p.role
    )
    into v_profile
    from public.profiles p
    where p.id = p_user_id;
  end if;

  return jsonb_build_object(
    'profile', coalesce(v_profile, '{}'::jsonb),
    'page_views', coalesce((
      select jsonb_agg(row_to_json(t)::jsonb)
      from (
        select
          pv.id,
          pv.session_id,
          pv.path,
          pv.path_group,
          pv.title,
          pv.sequence_no,
          pv.entered_at,
          pv.exited_at,
          pv.duration_ms,
          pv.active_ms,
          pv.referrer_path
        from public.analytics_page_views pv
        where pv.entered_at >= p_from
          and pv.entered_at < p_to
          and (
            (p_user_id is not null and pv.user_id = p_user_id)
            or (p_visitor_id is not null and pv.visitor_id = p_visitor_id)
          )
        order by pv.entered_at desc
        limit greatest(least(coalesce(p_limit, 200), 500), 1)
      ) t
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(row_to_json(t)::jsonb)
      from (
        select
          s.id,
          s.started_at,
          s.ended_at,
          s.entry_path,
          s.exit_path,
          s.page_count,
          s.duration_ms,
          s.user_role,
          s.is_guest
        from public.analytics_sessions s
        where s.started_at >= p_from
          and s.started_at < p_to
          and (
            (p_user_id is not null and s.user_id = p_user_id)
            or (p_visitor_id is not null and s.visitor_id = p_visitor_id)
          )
        order by s.started_at desc
        limit 50
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_get_activity_overview(text, timestamptz, timestamptz) from public;
revoke all on function public.admin_get_top_pages(timestamptz, timestamptz, integer) from public;
revoke all on function public.admin_get_top_users(timestamptz, timestamptz, integer) from public;
revoke all on function public.admin_get_top_visitors(timestamptz, timestamptz, integer) from public;
revoke all on function public.admin_get_user_journey(uuid, uuid, timestamptz, timestamptz, integer) from public;

grant execute on function public.admin_get_activity_overview(text, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_get_top_pages(timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.admin_get_top_users(timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.admin_get_top_visitors(timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.admin_get_user_journey(uuid, uuid, timestamptz, timestamptz, integer) to authenticated;
