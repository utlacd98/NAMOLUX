-- Production hardening for billing, quotas, metrics, and administrator access.
-- This migration is intentionally additive so it can be applied to the existing
-- mature NamoLux database without rebuilding user-owned data.

alter table public.profiles
  add column if not exists stripe_status text,
  add column if not exists access_expires_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists last_stripe_event_created bigint;

create index if not exists profiles_stripe_subscription_idx
  on public.profiles (stripe_subscription_id);

create table if not exists public.email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'website',
  tags text[] not null default '{}',
  status text not null default 'subscribed'
    check (status in ('subscribed', 'unsubscribed', 'bounced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- NamoLux already has an older, empty version of this table in production.
-- Keep this migration compatible with that shape as well as clean installs.
alter table public.email_subscribers
  add column if not exists source text,
  add column if not exists tags text[],
  add column if not exists status text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.email_subscribers
set
  source = coalesce(source, 'website'),
  tags = coalesce(tags, '{}'::text[]),
  status = coalesce(status, 'subscribed'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now())
where source is null
   or tags is null
   or status is null
   or created_at is null
   or updated_at is null;

alter table public.email_subscribers
  alter column source set default 'website',
  alter column source set not null,
  alter column tags set default '{}'::text[],
  alter column tags set not null,
  alter column status set default 'subscribed',
  alter column status set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

create table if not exists public.stripe_events (
  event_id text primary key,
  type text not null,
  created bigint not null,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  attempts integer not null default 1,
  error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('user', 'anonymous')),
  subject_hash text not null,
  feature text not null,
  window_start timestamptz not null,
  reset_at timestamptz not null,
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_type, subject_hash, feature, window_start)
);

create index if not exists usage_counters_expiry_idx
  on public.usage_counters (reset_at);

create table if not exists public.metric_events (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  metadata jsonb,
  user_agent text,
  country text,
  session_id text,
  device text,
  referrer text,
  route text,
  created_at timestamptz not null default now()
);

create index if not exists metric_events_created_at_idx
  on public.metric_events (created_at desc);
create index if not exists metric_events_action_created_at_idx
  on public.metric_events (action, created_at desc);
create index if not exists metric_events_session_created_at_idx
  on public.metric_events (session_id, created_at desc)
  where session_id is not null;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.generation_logs
  add column if not exists subject_hash text;
alter table public.generation_logs
  alter column ip_address drop not null;

-- The application now stores only keyed subject hashes. Remove legacy raw IP
-- values and helpers so future code cannot accidentally reintroduce that path.
update public.generation_logs set ip_address = null where ip_address is not null;
drop index if exists public.idx_generation_logs_ip_monthly;
drop function if exists public.get_ip_generation_count(inet);
drop function if exists public.get_user_generation_count(uuid);
drop function if exists public.get_rate_limit_reset_time(inet, uuid);

create index if not exists generation_logs_subject_monthly_idx
  on public.generation_logs (subject_hash, created_at desc)
  where subject_hash is not null;

-- Atomically consumes one unit. The conditional conflict update prevents two
-- concurrent requests from both passing the same final quota slot.
create or replace function public.consume_usage_counter(
  p_subject_type text,
  p_subject_hash text,
  p_feature text,
  p_window_start timestamptz,
  p_reset_at timestamptz,
  p_limit integer
)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  consumed_count integer;
  existing_count integer;
begin
  if p_limit < 1 or p_subject_hash is null or length(p_subject_hash) < 16 then
    raise exception 'invalid quota request';
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
    return query select true, consumed_count;
    return;
  end if;

  select usage_count into existing_count
  from public.usage_counters
  where subject_type = p_subject_type
    and subject_hash = p_subject_hash
    and feature = p_feature
    and window_start = p_window_start;

  return query select false, coalesce(existing_count, p_limit);
end;
$$;

alter table public.email_subscribers enable row level security;
alter table public.stripe_events enable row level security;
alter table public.usage_counters enable row level security;
alter table public.metric_events enable row level security;
alter table public.admin_users enable row level security;

-- Service-role calls bypass RLS, so broad public policies are unnecessary.
drop policy if exists "Service role can manage emails" on public.email_subscribers;
drop policy if exists "Users can view own logs" on public.generation_logs;

-- Preserve profile self-service access while scoping the policies to signed-in
-- users and evaluating auth.uid() once per statement.
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter function public.handle_updated_at() set search_path = pg_catalog, public;
revoke execute on function public.handle_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke all on public.email_subscribers from public, anon, authenticated;
revoke all on public.stripe_events from public, anon, authenticated;
revoke all on public.usage_counters from public, anon, authenticated;
revoke all on public.metric_events from public, anon, authenticated;
revoke all on public.admin_users from public, anon, authenticated;
revoke all on public.generation_logs from public, anon, authenticated;
revoke execute on function public.consume_usage_counter(text, text, text, timestamptz, timestamptz, integer)
  from public, anon, authenticated;

grant all on public.email_subscribers to service_role;
grant all on public.stripe_events to service_role;
grant all on public.usage_counters to service_role;
grant all on public.metric_events to service_role;
grant all on public.admin_users to service_role;
grant all on public.generation_logs to service_role;
grant execute on function public.consume_usage_counter(text, text, text, timestamptz, timestamptz, integer)
  to service_role;

comment on table public.admin_users is
  'Server-authorized administrator allowlist. No browser role receives table privileges.';
comment on function public.consume_usage_counter(text, text, text, timestamptz, timestamptz, integer) is
  'Service-role-only atomic quota and burst-limit consumer.';
