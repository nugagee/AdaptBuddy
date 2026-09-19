-- Capture submitter identity for logged-in and guest experience feedback.

alter table public.product_feedback
  add column if not exists submitter_name text not null default '',
  add column if not exists submitter_email text not null default '',
  add column if not exists visitor_key text not null default '',
  add column if not exists is_guest boolean not null default false,
  add column if not exists buddy_id text,
  add column if not exists path text;

create index if not exists product_feedback_visitor_key_idx
  on public.product_feedback (visitor_key, created_at desc);

create index if not exists product_feedback_submitter_email_idx
  on public.product_feedback (submitter_email)
  where submitter_email <> '';

-- Backfill from profiles where possible.
update public.product_feedback pf
set
  submitter_name = coalesce(nullif(trim(pf.submitter_name), ''), nullif(trim(p.full_name), ''), ''),
  submitter_email = coalesce(nullif(trim(pf.submitter_email), ''), nullif(trim(p.email), ''), ''),
  buddy_id = coalesce(nullif(trim(pf.buddy_id), ''), nullif(trim(p.buddy_id), ''))
from public.profiles p
where pf.user_id = p.id
  and (
    coalesce(pf.submitter_name, '') = ''
    or coalesce(pf.submitter_email, '') = ''
    or pf.buddy_id is null
  );

create or replace function public.submit_product_feedback(p_data jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_user_id uuid;
  v_role text;
  v_is_guest boolean;
  v_auth uuid := auth.uid();
  v_text text;
  v_rating integer;
  v_type text;
  v_sentiment text;
  v_themes jsonb;
begin
  v_is_guest := coalesce((p_data->>'is_guest')::boolean, false);
  v_text := left(trim(coalesce(p_data->>'feedback_text', '')), 8000);
  if v_text = '' then
    raise exception 'Feedback text is required';
  end if;

  v_rating := greatest(1, least(5, coalesce((p_data->>'rating')::integer, 4)));
  v_type := lower(coalesce(p_data->>'feedback_type', 'idea'));
  if v_type not in ('idea', 'confusing', 'bug', 'safety', 'delight') then
    v_type := 'idea';
  end if;

  v_sentiment := lower(coalesce(p_data->>'sentiment', 'neutral'));
  if v_sentiment not in ('positive', 'neutral', 'concerned') then
    v_sentiment := 'neutral';
  end if;

  v_themes := coalesce(p_data->'themes', '[]'::jsonb);
  if jsonb_typeof(v_themes) <> 'array' then
    v_themes := '[]'::jsonb;
  end if;

  v_role := lower(coalesce(p_data->>'user_role', 'parent'));
  if v_role not in ('child', 'parent', 'teacher', 'admin') then
    v_role := 'parent';
  end if;

  if v_is_guest then
    v_user_id := null;
  else
    begin
      v_user_id := nullif(trim(coalesce(p_data->>'user_id', '')), '')::uuid;
    exception when others then
      v_user_id := null;
    end;

    if v_auth is null then
      raise exception 'Authentication required';
    end if;
    if v_user_id is null then
      v_user_id := v_auth;
    elsif v_user_id <> v_auth then
      raise exception 'Cannot submit feedback for another user';
    end if;
  end if;

  insert into public.product_feedback (
    user_id,
    user_role,
    child_id,
    source_area,
    feedback_type,
    rating,
    feedback_text,
    sentiment,
    themes,
    metadata,
    submitter_name,
    submitter_email,
    visitor_key,
    is_guest,
    buddy_id,
    path
  )
  values (
    v_user_id,
    v_role,
    case
      when nullif(trim(coalesce(p_data->>'child_id', '')), '') is null then null
      else (p_data->>'child_id')::uuid
    end,
    left(coalesce(nullif(trim(p_data->>'source_area'), ''), 'general'), 120),
    v_type,
    v_rating,
    v_text,
    v_sentiment,
    v_themes,
    coalesce(p_data->'metadata', '{}'::jsonb),
    left(trim(coalesce(p_data->>'submitter_name', '')), 160),
    left(trim(coalesce(p_data->>'submitter_email', '')), 200),
    left(trim(coalesce(p_data->>'visitor_key', '')), 128),
    v_is_guest,
    nullif(left(trim(coalesce(p_data->>'buddy_id', '')), 64), ''),
    left(coalesce(nullif(trim(p_data->>'path'), ''), '/'), 512)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_product_feedback(jsonb) from public;
grant execute on function public.submit_product_feedback(jsonb) to anon, authenticated;
