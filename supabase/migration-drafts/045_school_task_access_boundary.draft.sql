-- DRAFT / LOCAL REHEARSAL ONLY. Not in the automatic migrations directory.
-- Requires the separately reviewed broad 041 guardian/class boundary. The narrow
-- deployed 041/044 support-only release is NOT sufficient. Do not apply either
-- broad draft to live data without inventory, backup, authority and recovery review.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
do $$begin
  if not exists (select 1 from pg_trigger where tgrelid='public.class_memberships'::regclass
    and tgname='class_memberships_enforce_approval' and not tgisinternal)
    or not exists (select 1 from information_schema.columns where table_schema='public'
      and table_name='trusted_adults' and column_name='guardian_verified_at') then
    raise exception 'School task candidate requires reviewed guardian and class approval contracts.';
  end if;
end$$;

-- These helpers are private. Only scoped policy entrypoints below are callable.
create or replace function public.school_task_actor_active_v1(p_id uuid, p_role text)
returns boolean language sql stable security definer set search_path=pg_catalog,public,auth
as $$
  select exists(select 1 from public.profiles p join auth.users u on u.id=p.id
    where p.id=p_id and p.role::text=p_role and p.status='active' and p.is_authorized is true
      and u.email_confirmed_at is not null and u.deleted_at is null
      and (u.banned_until is null or u.banned_until<=now())
      and lower(p.email)=lower(u.email)
      and (p_role<>'admin' or (p.admin_verified_at is not null and p.admin_verified_by is not null
        and p.admin_verification_method='service_role_bootstrap')));
$$;
create or replace function public.school_task_session_active_v1()
returns boolean language sql stable security definer set search_path=pg_catalog,public,auth
as $$
  select coalesce(auth.jwt()->>'role','')='authenticated' and exists(
    select 1 from auth.sessions s where s.user_id=auth.uid()
      and s.id::text=auth.jwt()->>'session_id' and (s.not_after is null or s.not_after>now()));
$$;
create or replace function public.school_task_guardian_valid_v1(p_child uuid,p_adult uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public,auth
as $$
  select public.school_task_actor_active_v1(p_child,'child')
    and public.school_task_actor_active_v1(p_adult,'parent')
    and exists(select 1 from public.trusted_adults g join auth.users u on u.id=g.adult_id
      join public.child_relationships cr on cr.child_id=g.child_id and cr.parent_id=g.adult_id
      where g.child_id=p_child and g.adult_id=p_adult and g.status in ('active','connected')
        and lower(g.role) in ('parent','guardian','grandparent','carer')
        and lower(g.email)=lower(u.email) and g.accepted_at is not null
        and g.accepted_by=p_adult and g.acceptance_method='account_email'
        and g.guardian_verified_at is not null
        and g.guardian_verification_method in ('manual_admin','verified_provider')
        and public.school_task_actor_active_v1(g.guardian_verified_by,'admin'));
$$;
create or replace function public.school_task_class_ready_v1(p_class uuid,p_child uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public,auth
as $$
  select public.school_task_actor_active_v1(p_child,'child') and exists(
    select 1 from public.teacher_classes tc
    join public.class_memberships cm on cm.class_id=tc.id and cm.teacher_id=tc.teacher_id
    join public.class_join_requests jr on jr.class_id=cm.class_id and jr.child_id=cm.child_id
    where tc.id=p_class and cm.child_id=p_child and cm.status='active'
      and (public.school_task_actor_active_v1(tc.teacher_id,'teacher')
        or public.school_task_actor_active_v1(tc.teacher_id,'admin'))
      and jr.status='approved' and jr.parent_approved is true and jr.teacher_approved is true
      and jr.parent_approved_at is not null and jr.teacher_approved_at is not null and jr.approved_at is not null
      and jr.teacher_approved_by=tc.teacher_id and jr.parent_approved_by<>tc.teacher_id
      and jr.visibility_settings=cm.visibility_settings
      and cm.visibility_settings->'academicTasks'='true'::jsonb
      and public.school_task_guardian_valid_v1(p_child,jr.parent_approved_by));
$$;
revoke all on function public.school_task_actor_active_v1(uuid,text),public.school_task_session_active_v1(),
  public.school_task_guardian_valid_v1(uuid,uuid),public.school_task_class_ready_v1(uuid,uuid)
  from public,anon,authenticated;

create or replace function public.school_task_manage_assignment_v1(p_class uuid,p_teacher uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public,auth
as $$
  select public.school_task_session_active_v1() and p_teacher=auth.uid()
    and (public.school_task_actor_active_v1(auth.uid(),'teacher') or public.school_task_actor_active_v1(auth.uid(),'admin'))
    and exists(select 1 from public.teacher_classes tc where tc.id=p_class and tc.teacher_id=auth.uid());
$$;
create or replace function public.school_task_read_assignment_v1(p_class uuid,p_teacher uuid,p_archived timestamptz)
returns boolean language sql stable security definer set search_path=pg_catalog,public,auth
as $$
  select public.school_task_manage_assignment_v1(p_class,p_teacher)
    or (public.school_task_session_active_v1() and p_archived is null
      and exists(select 1 from public.teacher_classes tc where tc.id=p_class and tc.teacher_id=p_teacher)
      and public.school_task_class_ready_v1(p_class,auth.uid()));
$$;
create or replace function public.school_task_submission_access_v1(p_assignment uuid,p_child uuid,p_write boolean)
returns boolean language sql stable security definer set search_path=pg_catalog,public,auth
as $$
  select public.school_task_session_active_v1() and exists(
    select 1 from public.teacher_assignments ta join public.teacher_classes tc
      on tc.id=ta.class_id and tc.teacher_id=ta.teacher_id
    where ta.id=p_assignment and ta.archived_at is null
      and public.school_task_class_ready_v1(ta.class_id,p_child)
      and (auth.uid()=p_child or (not p_write and public.school_task_manage_assignment_v1(ta.class_id,ta.teacher_id))));
$$;
revoke all on function public.school_task_manage_assignment_v1(uuid,uuid),
  public.school_task_read_assignment_v1(uuid,uuid,timestamptz),public.school_task_submission_access_v1(uuid,uuid,boolean)
  from public,anon,authenticated;
grant execute on function public.school_task_manage_assignment_v1(uuid,uuid),
  public.school_task_read_assignment_v1(uuid,uuid,timestamptz),public.school_task_submission_access_v1(uuid,uuid,boolean)
  to authenticated;

-- Break the historical profile -> class -> profile policy recursion without
-- widening access. Privileged maintenance remains separate from browser access.
create or replace function public.school_task_current_teacher_v1(p_teacher uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public,auth
as $$select public.school_task_session_active_v1() and p_teacher=auth.uid()
  and (public.school_task_actor_active_v1(auth.uid(),'teacher') or public.school_task_actor_active_v1(auth.uid(),'admin'));$$;
revoke all on function public.school_task_current_teacher_v1(uuid) from public,anon,authenticated;
grant execute on function public.school_task_current_teacher_v1(uuid) to authenticated;
drop policy if exists "Teachers can manage own classes" on public.teacher_classes;
create policy "Teachers can manage own classes" on public.teacher_classes for all to authenticated
  using(public.school_task_current_teacher_v1(teacher_id))
  with check(public.school_task_current_teacher_v1(teacher_id));

-- Restrictive policies AND with historical permissive policies; adding another
-- permissive rule alone would leave the old self-ID-only write path open.
alter table public.teacher_assignments enable row level security;
alter table public.assignment_submissions enable row level security;
drop policy if exists school_task_read_gate on public.teacher_assignments;
create policy school_task_read_gate on public.teacher_assignments as restrictive for select to authenticated
  using(public.school_task_read_assignment_v1(class_id,teacher_id,archived_at));
drop policy if exists school_task_insert_gate on public.teacher_assignments;
create policy school_task_insert_gate on public.teacher_assignments as restrictive for insert to authenticated
  with check(public.school_task_manage_assignment_v1(class_id,teacher_id));
drop policy if exists school_task_update_gate on public.teacher_assignments;
create policy school_task_update_gate on public.teacher_assignments as restrictive for update to authenticated
  using(public.school_task_manage_assignment_v1(class_id,teacher_id))
  with check(public.school_task_manage_assignment_v1(class_id,teacher_id));
drop policy if exists school_task_delete_gate on public.teacher_assignments;
create policy school_task_delete_gate on public.teacher_assignments as restrictive for delete to authenticated
  using(public.school_task_manage_assignment_v1(class_id,teacher_id));
drop policy if exists school_submission_read_gate on public.assignment_submissions;
create policy school_submission_read_gate on public.assignment_submissions as restrictive for select to authenticated
  using(public.school_task_submission_access_v1(assignment_id,child_id,false));
drop policy if exists school_submission_insert_gate on public.assignment_submissions;
create policy school_submission_insert_gate on public.assignment_submissions as restrictive for insert to authenticated
  with check(child_id=auth.uid() and public.school_task_submission_access_v1(assignment_id,child_id,true));
drop policy if exists school_submission_update_gate on public.assignment_submissions;
create policy school_submission_update_gate on public.assignment_submissions as restrictive for update to authenticated
  using(child_id=auth.uid() and public.school_task_submission_access_v1(assignment_id,child_id,true))
  with check(child_id=auth.uid() and public.school_task_submission_access_v1(assignment_id,child_id,true));
drop policy if exists school_submission_delete_gate on public.assignment_submissions;
create policy school_submission_delete_gate on public.assignment_submissions as restrictive for delete to authenticated
  using(child_id=auth.uid() and public.school_task_submission_access_v1(assignment_id,child_id,true));

create or replace function public.school_task_immutable_identity_v1()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public,auth
as $$begin
  if coalesce(auth.jwt()->>'role','')='authenticated' then
    if new.id is distinct from old.id then
      raise exception using errcode='42501',message='Task record identity cannot be changed.';
    end if;
    if tg_table_name='teacher_assignments' then
      if new.class_id is distinct from old.class_id or new.teacher_id is distinct from old.teacher_id
        or new.created_at is distinct from old.created_at then
        raise exception using errcode='42501',message='Task ownership cannot be changed.';
      end if;
    else
      if new.assignment_id is distinct from old.assignment_id or new.child_id is distinct from old.child_id then
        raise exception using errcode='42501',message='Submission ownership cannot be changed.';
      end if;
    end if;
  end if;
  return new;
end$$;
revoke all on function public.school_task_immutable_identity_v1() from public,anon,authenticated;
drop trigger if exists school_task_immutable_identity on public.teacher_assignments;
create trigger school_task_immutable_identity before update on public.teacher_assignments
  for each row execute function public.school_task_immutable_identity_v1();
drop trigger if exists school_submission_immutable_identity on public.assignment_submissions;
create trigger school_submission_immutable_identity before update on public.assignment_submissions
  for each row execute function public.school_task_immutable_identity_v1();

-- A SECURITY DEFINER summary bypasses table RLS, so its own checks are essential.
-- Retain the existing response signature: no private response_text/audio/diary.
create or replace function public.parent_assignment_summaries(p_child_ids uuid[] default null)
returns table(assignment_id uuid,child_id uuid,child_name text,class_id uuid,class_name text,
  school_name text,teacher_id uuid,teacher_name text,teacher_email text,title text,description text,
  assignment_type text,support_tools text[],due_at timestamptz,created_at timestamptz,status text,
  support_used text[],mood_after_task text,updated_at timestamptz)
language sql stable security definer set search_path=pg_catalog,public,auth
as $$
  select ta.id,cm.child_id,coalesce(nullif(child.full_name,''),nullif(child.child_name,''),nullif(child.first_name,''),'Child'),
    cm.class_id,tc.class_name,tc.school_name,ta.teacher_id,
    coalesce(nullif(teacher.full_name,''),nullif(teacher.first_name,''),teacher.email,'Teacher'),
    coalesce(teacher.email,''),ta.title,ta.description,ta.assignment_type,ta.support_tools,
    ta.due_at,ta.created_at,coalesce(sub.status,'not_started'),coalesce(sub.support_used,'{}'::text[]),
    sub.mood_after_task,sub.updated_at
  from public.class_memberships cm join public.teacher_classes tc on tc.id=cm.class_id and tc.teacher_id=cm.teacher_id
  join public.class_join_requests jr on jr.class_id=cm.class_id and jr.child_id=cm.child_id
  join public.teacher_assignments ta on ta.class_id=cm.class_id and ta.teacher_id=tc.teacher_id
  join public.profiles child on child.id=cm.child_id join public.profiles teacher on teacher.id=tc.teacher_id
  left join public.assignment_submissions sub on sub.assignment_id=ta.id and sub.child_id=cm.child_id
  where public.school_task_session_active_v1() and jr.parent_approved_by=auth.uid()
    and public.school_task_guardian_valid_v1(cm.child_id,auth.uid())
    and public.school_task_class_ready_v1(cm.class_id,cm.child_id) and ta.archived_at is null
    and (p_child_ids is null or cardinality(p_child_ids)=0 or cm.child_id=any(p_child_ids))
  order by coalesce(ta.due_at,ta.created_at) desc,ta.created_at desc,ta.id,cm.child_id limit 50;
$$;
revoke all on function public.parent_assignment_summaries(uuid[]) from public,anon,authenticated;
grant execute on function public.parent_assignment_summaries(uuid[]) to authenticated;
commit;
