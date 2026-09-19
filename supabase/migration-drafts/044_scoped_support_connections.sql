-- In-app invitations and explicitly addressed support records.
-- Requires the reviewed 041 profile-authority boundary and verified admin recovery.
-- Does not create legacy family/class access, emails, shared journals or alerts.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
do $$begin
  if not exists (select 1 from pg_trigger where tgrelid='public.profiles'::regclass
    and tgname='profiles_protect_security_fields' and not tgisinternal) then
    raise exception 'Apply the reviewed profile-authority boundary first.';
  end if;
end$$;

create table if not exists public.trusted_support_contacts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  adult_id uuid references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  role text not null check (role in ('parent','guardian','grandparent','carer')),
  email text not null check (email=lower(trim(email)) and length(email) between 3 and 254),
  phone text not null default '' check (length(phone)<=40),
  status text not null default 'pending' check (status in ('pending','connected','declined','revoked','expired')),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete cascade,
  acceptance_method text,
  adult_attested_at timestamptz,
  expires_at timestamptz not null default (now()+interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (child_id is distinct from adult_id),
  check (status<>'connected' or (adult_id is not null and accepted_at is not null
    and accepted_by=adult_id and acceptance_method='account_email' and adult_attested_at is not null))
);
create unique index if not exists trusted_support_contacts_open_email_idx
  on public.trusted_support_contacts(child_id,email) where status in ('pending','connected');
create index if not exists trusted_support_contacts_adult_idx on public.trusted_support_contacts(adult_id);

create table if not exists public.trusted_support_requests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  contact_id uuid references public.trusted_support_contacts(id) on delete cascade,
  source text not null check (source in ('buddy-conversation','mood-check-in','child-dashboard')),
  urgent boolean not null default false,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  seen_by uuid references public.profiles(id) on delete cascade,
  unique(child_id,request_id),
  check ((seen_at is null)=(seen_by is null))
);
create index if not exists trusted_support_requests_contact_idx on public.trusted_support_requests(contact_id,created_at desc);
-- Every browser read/write uses a bounded RPC. No generic admin/legacy-link policy.
alter table public.trusted_support_contacts enable row level security;
alter table public.trusted_support_requests enable row level security;
revoke all on public.trusted_support_contacts,public.trusted_support_requests from public,anon,authenticated;

create or replace function public.support_actor_active_v1(p_id uuid,p_role text)
returns boolean language sql stable security definer set search_path=public
as $$
 select exists(select 1 from public.profiles p join auth.users u on u.id=p.id
  where p.id=p_id and p.role::text=p_role and p.is_authorized is true and p.status='active'
   and u.email_confirmed_at is not null and u.deleted_at is null
   and (u.banned_until is null or u.banned_until<=now()));
$$;
revoke all on function public.support_actor_active_v1(uuid,text) from public,anon,authenticated;

create or replace function public.support_contact_valid_v1(p_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
 select exists(select 1 from public.trusted_support_contacts c join auth.users a on a.id=c.adult_id
   where c.id=p_id and c.status='connected' and c.accepted_by=c.adult_id
    and c.accepted_at is not null and c.adult_attested_at is not null
    and c.acceptance_method='account_email' and lower(a.email)=c.email
    and public.support_actor_active_v1(c.child_id,'child') and public.support_actor_active_v1(c.adult_id,'parent'));
$$;
revoke all on function public.support_contact_valid_v1(uuid) from public,anon,authenticated;

create or replace function public.invalidate_scoped_support_identity_v1()
returns trigger language plpgsql security definer set search_path=public
as $$begin
 if tg_table_schema='auth' then
   if new.email is not distinct from old.email and new.email_confirmed_at is not distinct from old.email_confirmed_at
     and new.banned_until is not distinct from old.banned_until and new.deleted_at is not distinct from old.deleted_at then return new; end if;
 else
   if new.role is not distinct from old.role and new.status is not distinct from old.status
     and new.is_authorized is not distinct from old.is_authorized then return new; end if;
 end if;
 update public.trusted_support_contacts set status='revoked',updated_at=now()
   where (child_id=new.id or adult_id=new.id) and status in ('pending','connected');
 return new;
end$$;
revoke all on function public.invalidate_scoped_support_identity_v1() from public,anon,authenticated;
drop trigger if exists auth_invalidate_scoped_support on auth.users;
create trigger auth_invalidate_scoped_support after update of email,email_confirmed_at,banned_until,deleted_at on auth.users
 for each row execute function public.invalidate_scoped_support_identity_v1();
drop trigger if exists profiles_invalidate_scoped_support on public.profiles;
create trigger profiles_invalidate_scoped_support after update of role,status,is_authorized on public.profiles
 for each row execute function public.invalidate_scoped_support_identity_v1();

create or replace function public.list_trusted_support_contacts_v1()
returns jsonb language plpgsql security definer set search_path=public
as $$declare v_uid uuid:=auth.uid(); v_email text; v_child boolean; begin
 v_child:=public.support_actor_active_v1(v_uid,'child');
 if not v_child and not public.support_actor_active_v1(v_uid,'parent') then
   raise exception using errcode='42501',message='Sign in with a confirmed, active child or parent account.'; end if;
 select lower(email) into v_email from auth.users where id=v_uid;
 return coalesce((select jsonb_agg(x.row order by x.priority,x.created_at desc) from (
  select jsonb_build_object('id',c.id,'child_id',c.child_id,'child_name',p.first_name,
    'adult_id',c.adult_id,'name',c.name,'role',c.role,'email',c.email,'phone',c.phone,
    'status',case when c.status='pending' and c.expires_at<=now() then 'expired'
                  when c.status='connected' and not public.support_contact_valid_v1(c.id) then 'revoked' else c.status end,
    'accepted_at',c.accepted_at,'accepted_by',c.accepted_by,'acceptance_method',c.acceptance_method,
    'created_at',c.created_at,'expires_at',c.expires_at) as row,c.created_at,
    case when c.status='connected' then 0 when c.status='pending' and c.expires_at>now() then 1 else 2 end as priority
  from public.trusted_support_contacts c join public.profiles p on p.id=c.child_id
  where (v_child and c.child_id=v_uid) or (not v_child and c.email=v_email and
    ((c.status='pending' and c.expires_at>now() and public.support_actor_active_v1(c.child_id,'child'))
      or (c.adult_id=v_uid and public.support_contact_valid_v1(c.id))))
  order by priority,c.created_at desc limit 100) x),'[]'::jsonb);
end$$;

create or replace function public.create_trusted_support_invitation_v1(p_child_id uuid,p_name text,p_role text,p_email text,p_phone text default '')
returns jsonb language plpgsql security definer set search_path=public
as $$declare v_uid uuid:=auth.uid(); v_email text:=lower(trim(coalesce(p_email,''))); v_existing public.trusted_support_contacts%rowtype; v_result public.trusted_support_contacts%rowtype; begin
 perform id from auth.users where id=v_uid for share;
 perform id from public.profiles where id=v_uid for share;
 if v_uid is distinct from p_child_id or not public.support_actor_active_v1(v_uid,'child') then
  raise exception using errcode='42501',message='A confirmed, active child account is required.'; end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 120 or lower(trim(coalesce(p_role,''))) not in ('parent','guardian','grandparent','carer')
  or length(v_email)>254 or v_email!~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(coalesce(p_phone,''))>40 then
  raise exception using errcode='22023',message='Enter a name, valid email, and parent, guardian, grandparent or carer role.'; end if;
 if exists(select 1 from auth.users where id=v_uid and lower(email)=v_email) then
  raise exception using errcode='22023',message='Choose an adult other than yourself.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text,442));
 update public.trusted_support_contacts set status='expired',updated_at=now() where child_id=v_uid and status='pending' and expires_at<=now();
 select * into v_existing from public.trusted_support_contacts where child_id=v_uid and email=v_email and status in ('pending','connected') for update;
 if found then
  if v_existing.status='connected' then raise exception using errcode='22023',message='This adult already has a support connection.'; end if;
  return to_jsonb(v_existing); -- Duplicate submission never resets consent or expiry.
 end if;
 if (select count(*) from public.trusted_support_contacts where child_id=v_uid and status in ('pending','connected'))>=10
   or (select count(*) from public.trusted_support_contacts where child_id=v_uid and created_at>now()-interval '1 day')>=20 then
  raise exception using errcode='22023',message='You have reached the invitation limit. Manage existing invitations first.'; end if;
 insert into public.trusted_support_contacts(child_id,name,role,email,phone)
  values(v_uid,trim(p_name),lower(trim(p_role)),v_email,trim(coalesce(p_phone,''))) returning * into v_result;
 return to_jsonb(v_result);
end$$;

create or replace function public.respond_trusted_support_invitation_v1(p_invitation_id uuid,p_accept boolean,p_is_adult boolean default false)
returns void language plpgsql security definer set search_path=public
as $$declare v_uid uuid:=auth.uid(); v_child uuid; c public.trusted_support_contacts%rowtype; v_email text; begin
 select child_id into v_child from public.trusted_support_contacts where id=p_invitation_id;
 -- Same lock order as Auth identity updates; acquire the connection only afterwards.
 perform id from auth.users where id in (v_uid,v_child) order by id for share;
 perform id from public.profiles where id in (v_uid,v_child) order by id for share;
 select lower(email) into v_email from auth.users where id=v_uid;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text,444));
 select * into c from public.trusted_support_contacts where id=p_invitation_id for update;
 if c.id is null or c.child_id is distinct from v_child or not public.support_actor_active_v1(v_uid,'parent')
  or not public.support_actor_active_v1(v_child,'child') or c.email is distinct from v_email or c.child_id=v_uid then
  raise exception using errcode='42501',message='Use the confirmed parent account invited by this child.'; end if;
 if p_accept is null or (p_accept and p_is_adult is not true) then
  raise exception using errcode='22023',message='Confirm that you are an adult before accepting.'; end if;
 if c.status<>'pending' or c.expires_at<=now() then
  raise exception using errcode='22023',message='This invitation is no longer pending.'; end if;
 if p_accept and (select count(*) from public.trusted_support_contacts where adult_id=v_uid and status='connected')>=50 then
  raise exception using errcode='22023',message='You can have 50 active support connections. End an existing connection first.'; end if;
 update public.trusted_support_contacts set status=case when p_accept then 'connected' else 'declined' end,
  adult_id=case when p_accept then v_uid else null end, accepted_by=case when p_accept then v_uid else null end,
  accepted_at=case when p_accept then now() else null end, adult_attested_at=case when p_accept then now() else null end,
  acceptance_method=case when p_accept then 'account_email' else null end,updated_at=now() where id=c.id;
end$$;

create or replace function public.revoke_trusted_support_contact_v1(p_contact_id uuid)
returns void language plpgsql security definer set search_path=public
as $$declare v_uid uuid:=auth.uid(); c public.trusted_support_contacts%rowtype; begin
 select * into c from public.trusted_support_contacts where id=p_contact_id for update;
 if c.id is null or not ((c.child_id=v_uid and public.support_actor_active_v1(v_uid,'child'))
  or (c.adult_id=v_uid and public.support_actor_active_v1(v_uid,'parent'))) then
  raise exception using errcode='42501',message='This support connection is not yours.'; end if;
 update public.trusted_support_contacts set status='revoked',updated_at=now() where id=c.id and status in ('pending','connected');
end$$;

create or replace function public.record_trusted_support_request_v1(p_child_id uuid,p_request_id uuid,p_source text,p_urgent boolean default false,p_contact_id uuid default null)
returns uuid language plpgsql security definer set search_path=public
as $$declare v_uid uuid:=auth.uid(); v_adult uuid; c public.trusted_support_contacts%rowtype; r public.trusted_support_requests%rowtype; v_id uuid; begin
 select adult_id into v_adult from public.trusted_support_contacts where id=p_contact_id;
 perform id from auth.users where id in (v_uid,v_adult) order by id for share;
 perform id from public.profiles where id in (v_uid,v_adult) order by id for share;
 if v_uid is distinct from p_child_id or not public.support_actor_active_v1(v_uid,'child') then
  raise exception using errcode='42501',message='A confirmed, active child account is required.'; end if;
 if p_request_id is null or p_source is null or p_urgent is null or p_source not in ('buddy-conversation','mood-check-in','child-dashboard') then
  raise exception using errcode='22023',message='A valid support request is required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text,443));
 select * into r from public.trusted_support_requests where child_id=v_uid and request_id=p_request_id;
 if found then
  if r.source<>p_source or r.urgent<>p_urgent or r.contact_id is distinct from p_contact_id then
    raise exception using errcode='22023',message='This request ID was already used for a different request.'; end if;
  return r.id;
 end if;
 if p_contact_id is not null then
  select * into c from public.trusted_support_contacts where id=p_contact_id for update;
  if c.child_id is distinct from v_uid or c.adult_id is distinct from v_adult or not public.support_contact_valid_v1(p_contact_id) then
   raise exception using errcode='42501',message='Select a currently accepted adult, or keep the record private.'; end if;
 end if;
 if (select count(*) from public.trusted_support_requests where child_id=v_uid and created_at>now()-interval '1 hour')>=30 then
  raise exception using errcode='22023',message='Too many recent requests. Please speak to a safe adult directly.'; end if;
 insert into public.trusted_support_requests(child_id,request_id,source,urgent,contact_id)
  values(v_uid,p_request_id,p_source,p_urgent,p_contact_id) returning id into v_id;
 return v_id;
end$$;

create or replace function public.list_trusted_support_requests_v1()
returns jsonb language plpgsql security definer set search_path=public
as $$declare v_uid uuid:=auth.uid(); v_child boolean; begin
 v_child:=public.support_actor_active_v1(v_uid,'child');
 if not v_child and not public.support_actor_active_v1(v_uid,'parent') then
  raise exception using errcode='42501',message='A confirmed, active child or parent account is required.'; end if;
 return coalesce((select jsonb_agg(x.row order by x.created_at desc) from (
  select jsonb_build_object('id',r.id,'child_name',p.first_name,'contact_id',r.contact_id,'adult_name',c.name,
   'source',r.source,'urgent',r.urgent,'created_at',r.created_at,'seen_at',r.seen_at,
   'connection_active',coalesce(public.support_contact_valid_v1(c.id),false)) as row,r.created_at
  from public.trusted_support_requests r join public.profiles p on p.id=r.child_id
   left join public.trusted_support_contacts c on c.id=r.contact_id
  where (v_child and r.child_id=v_uid) or (not v_child and c.adult_id=v_uid
    and public.support_contact_valid_v1(c.id) and r.created_at>=c.accepted_at)
  order by r.created_at desc limit 100) x),'[]'::jsonb);
end$$;

create or replace function public.acknowledge_trusted_support_request_v1(p_request_id uuid)
returns void language plpgsql security definer set search_path=public
as $$declare v_uid uuid:=auth.uid(); v_contact uuid; v_child uuid; c public.trusted_support_contacts%rowtype; begin
 select contact_id,child_id into v_contact,v_child from public.trusted_support_requests where id=p_request_id;
 perform id from auth.users where id in (v_uid,v_child) order by id for share;
 perform id from public.profiles where id in (v_uid,v_child) order by id for share;
 select * into c from public.trusted_support_contacts where id=v_contact for update;
 if c.adult_id is distinct from v_uid or not public.support_contact_valid_v1(v_contact) then
  raise exception using errcode='42501',message='Only the currently connected recipient can mark this request as seen.'; end if;
 update public.trusted_support_requests set seen_at=coalesce(seen_at,now()),seen_by=v_uid
  where id=p_request_id and contact_id=c.id and created_at>=c.accepted_at;
end$$;

revoke all on function public.list_trusted_support_contacts_v1(),public.create_trusted_support_invitation_v1(uuid,text,text,text,text),
 public.respond_trusted_support_invitation_v1(uuid,boolean,boolean),public.revoke_trusted_support_contact_v1(uuid),
 public.record_trusted_support_request_v1(uuid,uuid,text,boolean,uuid),public.list_trusted_support_requests_v1(),
 public.acknowledge_trusted_support_request_v1(uuid) from public,anon,authenticated;
grant execute on function public.list_trusted_support_contacts_v1(),public.create_trusted_support_invitation_v1(uuid,text,text,text,text),
 public.respond_trusted_support_invitation_v1(uuid,boolean,boolean),public.revoke_trusted_support_contact_v1(uuid),
 public.record_trusted_support_request_v1(uuid,uuid,text,boolean,uuid),public.list_trusted_support_requests_v1(),
 public.acknowledge_trusted_support_request_v1(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
