-- Fix profiles RLS infinite recursion when evaluating is_admin().
-- Admin policies on public.profiles call is_admin(), which queried profiles
-- under RLS and re-entered the same policies (Postgres error 42P17).

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'::public.user_role
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
