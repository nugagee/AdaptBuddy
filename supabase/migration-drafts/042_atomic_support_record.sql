-- DRAFT ONLY: in-app support recording. This does not implement external delivery.
-- Apply only with reviewed child/adult RLS and the access-boundary changes.
begin;
create table if not exists public.child_support_request_receipts (
  child_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  source text not null,
  urgent boolean not null,
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (child_id, request_id)
);
alter table public.child_support_request_receipts enable row level security;
revoke all on public.child_support_request_receipts from public, anon, authenticated;

create or replace function public.record_child_support_request_v1(p_child_id uuid, p_request_id uuid, p_source text, p_urgent boolean default false)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  v_child_id uuid := auth.uid();
  v_existing public.child_support_request_receipts%rowtype;
  v_entry_id uuid;
  v_risk text := case when p_urgent then 'high' else 'medium' end;
begin
  if v_child_id is null or v_child_id is distinct from p_child_id or not exists (select 1 from public.profiles where id=v_child_id
    and role::text='child' and is_authorized is true and status='active') then
    raise exception using errcode='42501', message='An active child account is required.';
  end if;
  if p_request_id is null or p_source is null or p_urgent is null
    or p_source not in ('buddy-conversation','mood-check-in','child-dashboard') then
    raise exception using errcode='22023', message='A valid support request is required.';
  end if;
  -- Serialise retries of this one child/request; collisions only delay unrelated requests.
  perform pg_advisory_xact_lock(hashtextextended(v_child_id::text || ':' || p_request_id::text, 0));
  select * into v_existing from public.child_support_request_receipts
    where child_id=v_child_id and request_id=p_request_id;
  if found then
    if v_existing.source <> p_source or v_existing.urgent <> p_urgent then
      raise exception using errcode='22023', message='This request ID was already used for a different request.';
    end if;
    return v_existing.journal_entry_id;
  end if;
  insert into public.journal_entries(child_id,emotion,text,ai_analysis,risk_level,is_shared)
    values(v_child_id,'anxious','The child recorded a request for trusted-adult support in AdaptBuddy. External delivery has not been confirmed.',
      jsonb_build_object('source',p_source,'assessmentStatus','needs_human_review'),v_risk,true)
    returning id into v_entry_id;
  insert into public.parent_child_signals(child_id,emotion,color,note)
    values(v_child_id,'Child asked for trusted-adult support',case when p_urgent then 'red' else 'yellow' end,
      'The child used AdaptBuddy to request trusted-adult support. External delivery has not been confirmed.');
  insert into public.alerts(child_id,journal_entry_id,risk_level) values(v_child_id,v_entry_id,v_risk);
  insert into public.child_support_request_receipts(child_id,request_id,source,urgent,journal_entry_id)
    values(v_child_id,p_request_id,p_source,p_urgent,v_entry_id);
  return v_entry_id;
end;
$$;
revoke all on function public.record_child_support_request_v1(uuid,uuid,text,boolean) from public, anon;
grant execute on function public.record_child_support_request_v1(uuid,uuid,text,boolean) to authenticated;
commit;
