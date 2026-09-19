-- Metadata only: verify effective grants, defaults, and auth trigger wiring.
select jsonb_build_object(
  'authenticated_can_update_profile_role', has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'),
  'authenticated_can_insert_profile_role', has_column_privilege('authenticated', 'public.profiles', 'role', 'INSERT'),
  'authenticated_can_call_buddy_link', has_function_privilege('authenticated', 'public.link_child_by_buddy_id(text,text)', 'EXECUTE'),
  'profile_security_defaults', (
    select jsonb_agg(jsonb_build_object('name', column_name, 'default', column_default))
    from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name in ('role', 'status', 'is_authorized')
  ),
  'auth_user_triggers', (
    select jsonb_agg(jsonb_build_object('name', t.tgname, 'definition', pg_get_triggerdef(t.oid)))
    from pg_trigger t
    where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal
  ),
  'migration_history_table', to_regclass('supabase_migrations.schema_migrations')::text
) as privilege_audit;
