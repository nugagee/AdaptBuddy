-- Child-facing reassurance when an approved adult responds to a support signal.
-- This keeps adult workflow state separate from the child's notification state:
-- adults respond to the original source, while children receive an unread
-- "adult_response" notification that they can acknowledge.

alter table public.support_notification_receipts
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.support_notification_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.support_notification_receipts
  drop constraint if exists support_notification_source_check;

alter table public.support_notification_receipts
  add constraint support_notification_source_check
    check (source_type in (
      'alert',
      'journal_signal',
      'teacher_message',
      'care_meeting',
      'class_request',
      'assignment_help',
      'adult_response'
    ));

alter table public.support_notification_events
  drop constraint if exists support_notification_events_source_check;

alter table public.support_notification_events
  add constraint support_notification_events_source_check
    check (source_type in (
      'alert',
      'journal_signal',
      'teacher_message',
      'care_meeting',
      'class_request',
      'assignment_help',
      'adult_response'
    ));

drop function if exists public.notify_child_of_adult_response(uuid, text, uuid, text, text);

create or replace function public.notify_child_of_adult_response(
  p_child_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adult_id uuid := auth.uid();
  v_allowed boolean := false;
  v_receipt_id uuid;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_metadata jsonb;
begin
  if v_adult_id is null then
    raise exception 'Auth session missing';
  end if;

  if p_child_id is null or p_source_id is null then
    raise exception 'Child and source are required';
  end if;

  if p_status not in ('seen', 'responded', 'escalated', 'resolved') then
    raise exception 'Unsupported adult response status';
  end if;

  if p_source_type not in (
    'alert',
    'journal_signal',
    'teacher_message',
    'care_meeting',
    'class_request',
    'assignment_help'
  ) then
    raise exception 'Unsupported adult response source';
  end if;

  select
    exists (
      select 1
      from public.profiles p
      where p.id = v_adult_id
        and p.role = 'admin'
    )
    or exists (
      select 1
      from public.child_relationships cr
      where cr.parent_id = v_adult_id
        and cr.child_id = p_child_id
    )
    or exists (
      select 1
      from public.trusted_adults ta
      where ta.adult_id = v_adult_id
        and ta.child_id = p_child_id
        and coalesce(ta.status, 'active') in ('active', 'connected')
    )
    or exists (
      select 1
      from public.class_memberships cm
      where cm.teacher_id = v_adult_id
        and cm.child_id = p_child_id
        and coalesce(cm.status, 'active') = 'active'
    )
  into v_allowed;

  if not v_allowed then
    raise exception 'You are not allowed to respond to this child support signal';
  end if;

  v_note := coalesce(
    v_note,
    case p_status
      when 'seen' then 'A trusted adult has seen this and knows you asked for support.'
      when 'responded' then 'A trusted adult has responded. You do not have to hold this alone.'
      when 'escalated' then 'A trusted adult is getting extra support so the right person can help.'
      when 'resolved' then 'A trusted adult marked this as resolved. You can ask again if you still need help.'
      else 'A trusted adult has responded to your support signal.'
    end
  );

  v_metadata := jsonb_build_object(
    'original_source_type', p_source_type,
    'original_source_id', p_source_id,
    'adult_status', p_status,
    'adult_user_id', v_adult_id
  );

  insert into public.support_notification_receipts (
    user_id,
    source_type,
    source_id,
    status,
    note,
    metadata,
    seen_at,
    responded_at,
    escalated_at,
    resolved_at
  )
  values (
    p_child_id,
    'adult_response',
    p_source_id,
    'unread',
    v_note,
    v_metadata,
    null,
    null,
    null,
    null
  )
  on conflict (user_id, source_type, source_id)
  do update set
    status = 'unread',
    note = excluded.note,
    metadata = excluded.metadata,
    seen_at = null,
    responded_at = null,
    escalated_at = null,
    resolved_at = null
  returning id into v_receipt_id;

  insert into public.support_notification_events (
    receipt_id,
    user_id,
    source_type,
    source_id,
    status,
    note,
    metadata
  )
  values (
    v_receipt_id,
    p_child_id,
    'adult_response',
    p_source_id,
    p_status,
    v_note,
    v_metadata
  );
end;
$$;

grant execute on function public.notify_child_of_adult_response(uuid, text, uuid, text, text) to authenticated;
