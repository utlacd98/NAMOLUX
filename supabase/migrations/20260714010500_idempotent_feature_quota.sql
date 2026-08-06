-- Consume a monthly feature allowance once per opaque workflow key. This uses
-- the existing usage_counters table: no new table or column is required.
create or replace function public.consume_usage_counter_idempotent(
  p_subject_type text,
  p_subject_hash text,
  p_feature text,
  p_idempotency_hash text,
  p_window_start timestamptz,
  p_reset_at timestamptz,
  p_limit integer
)
returns table (allowed boolean, used integer, replayed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  marker_feature text;
  marker_exists boolean;
  consumed_count integer;
  existing_count integer;
begin
  if p_limit < 1
    or p_subject_hash is null
    or length(p_subject_hash) < 16
    or p_feature !~ '^[a-z0-9-]{3,64}$'
    or p_idempotency_hash !~ '^[a-f0-9]{24}$'
  then
    raise exception 'invalid idempotent quota request';
  end if;

  marker_feature := 'idem:' || p_feature || ':' || p_idempotency_hash;

  -- Serialize the same subject/feature/workflow so concurrent retries cannot
  -- consume more than one monthly unit before the marker becomes visible.
  perform pg_advisory_xact_lock(
    hashtextextended(p_subject_hash || ':' || p_feature || ':' || p_idempotency_hash, 0)
  );

  select exists (
    select 1
    from public.usage_counters
    where subject_type = p_subject_type
      and subject_hash = p_subject_hash
      and feature = marker_feature
      and window_start = p_window_start
  ) into marker_exists;

  if marker_exists then
    select usage_count into existing_count
    from public.usage_counters
    where subject_type = p_subject_type
      and subject_hash = p_subject_hash
      and feature = p_feature
      and window_start = p_window_start;

    return query select true, coalesce(existing_count, 0), true;
    return;
  end if;

  insert into public.usage_counters (
    subject_type, subject_hash, feature, window_start, reset_at, usage_count
  ) values (
    p_subject_type, p_subject_hash, p_feature, p_window_start, p_reset_at, 1
  )
  on conflict (subject_type, subject_hash, feature, window_start)
  do update set
    usage_count = public.usage_counters.usage_count + 1,
    reset_at = excluded.reset_at,
    updated_at = now()
  where public.usage_counters.usage_count < p_limit
  returning usage_count into consumed_count;

  if consumed_count is not null then
    insert into public.usage_counters (
      subject_type, subject_hash, feature, window_start, reset_at, usage_count
    ) values (
      p_subject_type, p_subject_hash, marker_feature, p_window_start, p_reset_at, 1
    )
    on conflict (subject_type, subject_hash, feature, window_start) do nothing;

    return query select true, consumed_count, false;
    return;
  end if;

  select usage_count into existing_count
  from public.usage_counters
  where subject_type = p_subject_type
    and subject_hash = p_subject_hash
    and feature = p_feature
    and window_start = p_window_start;

  return query select false, coalesce(existing_count, p_limit), false;
end;
$$;

revoke execute on function public.consume_usage_counter_idempotent(
  text, text, text, text, timestamptz, timestamptz, integer
) from public, anon, authenticated;

grant execute on function public.consume_usage_counter_idempotent(
  text, text, text, text, timestamptz, timestamptz, integer
) to service_role;

comment on function public.consume_usage_counter_idempotent(
  text, text, text, text, timestamptz, timestamptz, integer
) is 'Service-role-only idempotent monthly feature quota consumer using usage_counters markers.';
