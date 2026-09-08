-- PR #15 review: metadata only. Does not read child/adult records or change data.
-- Use against the confirmed AdaptBuddy project; never run the draft 041 here.
select jsonb_build_object(
  'checked_at', now(),
  'database', current_database(),
  'tables', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', c.relname, 'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity
    ) order by c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and c.relname in ('profiles', 'trusted_adults', 'child_relationships',
        'class_join_requests', 'class_memberships', 'teacher_classes',
        'journal_entries', 'alerts', 'parent_child_signals', 'mood_check_ins',
        'safeguarding_admin_quarantine', 'safeguarding_link_quarantine',
        'safeguarding_state_quarantine')
  ),
  'columns', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', table_name, 'column', column_name, 'type', data_type,
      'nullable', is_nullable, 'default', column_default
    ) order by table_name, ordinal_position), '[]'::jsonb)
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('profiles', 'trusted_adults', 'class_join_requests',
        'class_memberships', 'mood_check_ins')
  ),
  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', policyname, 'command', cmd,
      'roles', roles, 'using', qual, 'with_check', with_check
    ) order by tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'public'
      and tablename in ('profiles', 'trusted_adults', 'child_relationships',
        'class_join_requests', 'class_memberships', 'teacher_classes',
        'journal_entries', 'alerts', 'parent_child_signals', 'mood_check_ins')
  ),
  'functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.proname, 'arguments', pg_get_function_identity_arguments(p.oid),
      'security_definer', p.prosecdef, 'grants', p.proacl,
      'definition', pg_get_functiondef(p.oid)
    ) order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.proname in ('add_trusted_adult_for_child',
        'accept_trusted_adult_invitation', 'revoke_trusted_adult_for_child',
        'link_child_by_buddy_id', 'unlink_child_from_parent', 'handle_new_user',
        'protect_profile_security_fields', 'remove_relationship_when_acceptance_ends',
        'sync_trusted_adult_links_for_profile', 'is_admin')
  ),
  'triggers', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname, 'name', t.tgname, 'definition', pg_get_triggerdef(t.oid)
    ) order by c.relname, t.tgname), '[]'::jsonb)
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal and n.nspname = 'public'
      and c.relname in ('profiles', 'trusted_adults', 'child_relationships',
        'class_join_requests', 'class_memberships')
  )
) as safeguarding_schema_audit;
