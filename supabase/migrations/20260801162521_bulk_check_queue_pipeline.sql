-- Durable, service-only availability jobs for the public decision workspace.
-- No raw DNS/RDAP responses are persisted: cache and result rows contain only
-- the compact status shown to founders, its confidence, source and timestamp.

create table if not exists public.domain_availability_cache (
  full_domain text primary key,
  status text not null check (status in ('available', 'taken', 'needs_verification')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  provider text not null default 'unknown' check (char_length(provider) <= 80),
  checked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint domain_availability_cache_domain_format_check
    check (full_domain ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(com|io|co|ai|app|dev)$'),
  constraint domain_availability_cache_expiry_check
    check (expires_at > checked_at)
);

create index if not exists domain_availability_cache_expiry_idx
  on public.domain_availability_cache (expires_at);

create table if not exists public.bulk_check_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  subject_type text not null check (subject_type in ('user', 'anonymous')),
  subject_hash text not null check (char_length(subject_hash) >= 16),
  access_token_hash text unique,
  -- Anonymous results are a session-only product surface. The server sets a
  -- short expiry on creation and prunes the job (and cascaded results) once
  -- it is no longer readable. Signed-in work is retained in saved projects,
  -- not in transient availability jobs.
  expires_at timestamptz,
  idempotency_hash text not null check (idempotency_hash ~ '^[a-f0-9]{64}$'),
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  names jsonb not null,
  tlds text[] not null,
  plan text not null check (plan in ('free', 'pro')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'partial', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  worker_token uuid,
  lease_expires_at timestamptz,
  queue_message_id text,
  provider_checks integer not null default 0 check (provider_checks >= 0),
  cached_checks integer not null default 0 check (cached_checks >= 0),
  provider_failures integer not null default 0 check (provider_failures >= 0),
  quota_charged_at timestamptz,
  quota_refunded_at timestamptz,
  error_code text,
  error_message text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bulk_check_jobs_subject_user_check
    check ((subject_type = 'user' and user_id is not null and access_token_hash is null)
      or (subject_type = 'anonymous' and user_id is null and access_token_hash is not null and access_token_hash ~ '^[a-f0-9]{64}$')),
  constraint bulk_check_jobs_anonymous_expiry_check
    check ((subject_type = 'anonymous' and expires_at is not null and expires_at > created_at)
      or (subject_type = 'user' and expires_at is null)),
  constraint bulk_check_jobs_names_array_check
    check (jsonb_typeof(names) = 'array' and jsonb_array_length(names) between 1 and 50),
  constraint bulk_check_jobs_tlds_check
    check (cardinality(tlds) between 1 and 6 and tlds <@ array['com', 'io', 'co', 'ai', 'app', 'dev']::text[]),
  constraint bulk_check_jobs_error_length_check
    check (error_message is null or char_length(error_message) <= 500),
  constraint bulk_check_jobs_terminal_completion_check
    check ((status in ('completed', 'partial', 'failed')) = (completed_at is not null))
);

create unique index if not exists bulk_check_jobs_subject_idempotency_uidx
  on public.bulk_check_jobs (subject_type, subject_hash, idempotency_hash);

create index if not exists bulk_check_jobs_queue_claim_idx
  on public.bulk_check_jobs (status, lease_expires_at, queued_at asc);

create index if not exists bulk_check_jobs_subject_active_idx
  on public.bulk_check_jobs (subject_type, subject_hash, status, lease_expires_at)
  where status = 'processing';

create index if not exists bulk_check_jobs_user_updated_idx
  on public.bulk_check_jobs (user_id, updated_at desc)
  where user_id is not null;

create index if not exists bulk_check_jobs_anonymous_expiry_idx
  on public.bulk_check_jobs (expires_at)
  where subject_type = 'anonymous';

create table if not exists public.bulk_check_job_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.bulk_check_jobs(id) on delete cascade,
  candidate_name text not null,
  tld text not null check (tld in ('com', 'io', 'co', 'ai', 'app', 'dev')),
  full_domain text not null,
  status text not null check (status in ('available', 'taken', 'needs_verification')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  provider text not null default 'unknown' check (char_length(provider) <= 80),
  checked_at timestamptz not null,
  from_cache boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bulk_check_job_results_domain_format_check
    check (full_domain = candidate_name || '.' || tld),
  constraint bulk_check_job_results_candidate_format_check
    check (candidate_name ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$')
);

create unique index if not exists bulk_check_job_results_job_domain_uidx
  on public.bulk_check_job_results (job_id, full_domain);

create index if not exists bulk_check_job_results_job_created_idx
  on public.bulk_check_job_results (job_id, created_at asc);

-- A single advisory lock makes the global capacity check and claim atomic.
-- The per-subject check gives each account one active provider job even when a
-- queue message is delivered more than once.
create or replace function public.claim_bulk_check_job(
  p_job_id uuid,
  p_worker_token uuid
)
returns table (claimed boolean, reason text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  job_record public.bulk_check_jobs%rowtype;
  active_count integer;
begin
  if p_job_id is null or p_worker_token is null then
    raise exception 'bulk check job id and worker token are required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('namolux:bulk-check-global-capacity', 0));

  select * into job_record
  from public.bulk_check_jobs
  where id = p_job_id
  for update;

  if not found then
    return query select false, 'not_found';
    return;
  end if;

  if job_record.status in ('completed', 'partial', 'failed') then
    return query select false, 'terminal';
    return;
  end if;

  if job_record.status = 'processing' and job_record.lease_expires_at > now() then
    return query select false, 'already_processing';
    return;
  end if;

  select count(*) into active_count
  from public.bulk_check_jobs
  where status = 'processing'
    and lease_expires_at > now()
    and id <> p_job_id;

  if active_count >= 4 then
    return query select false, 'global_capacity';
    return;
  end if;

  select count(*) into active_count
  from public.bulk_check_jobs
  where subject_type = job_record.subject_type
    and subject_hash = job_record.subject_hash
    and status = 'processing'
    and lease_expires_at > now()
    and id <> p_job_id;

  if active_count >= 1 then
    return query select false, 'account_capacity';
    return;
  end if;

  update public.bulk_check_jobs
  set status = 'processing',
      worker_token = p_worker_token,
      lease_expires_at = now() + interval '75 seconds',
      attempt_count = attempt_count + 1,
      started_at = coalesce(started_at, now()),
      updated_at = now()
  where id = p_job_id;

  return query select true, 'claimed';
end;
$$;

-- Refund only an idempotent marker owned by a fully failed provider run. The
-- same advisory key as consumption protects the aggregate from races.
create or replace function public.refund_usage_counter_idempotent(
  p_subject_type text,
  p_subject_hash text,
  p_feature text,
  p_idempotency_hash text,
  p_window_start timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  marker_feature text;
  marker_exists boolean;
begin
  if p_subject_type not in ('user', 'anonymous')
    or p_subject_hash is null
    or length(p_subject_hash) < 16
    or p_feature !~ '^[a-z0-9-]{3,64}$'
    or p_idempotency_hash !~ '^[a-f0-9]{24}$'
    or p_window_start is null
  then
    raise exception 'invalid idempotent quota refund';
  end if;

  marker_feature := 'idem:' || p_feature || ':' || p_idempotency_hash;
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

  if not marker_exists then
    return false;
  end if;

  delete from public.usage_counters
  where subject_type = p_subject_type
    and subject_hash = p_subject_hash
    and feature = marker_feature
    and window_start = p_window_start;

  update public.usage_counters
  set usage_count = greatest(0, usage_count - 1),
      updated_at = now()
  where subject_type = p_subject_type
    and subject_hash = p_subject_hash
    and feature = p_feature
    and window_start = p_window_start;

  return true;
end;
$$;

alter table public.domain_availability_cache enable row level security;
alter table public.bulk_check_jobs enable row level security;
alter table public.bulk_check_job_results enable row level security;

revoke all on public.domain_availability_cache from public, anon, authenticated;
revoke all on public.bulk_check_jobs from public, anon, authenticated;
revoke all on public.bulk_check_job_results from public, anon, authenticated;
revoke execute on function public.claim_bulk_check_job(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.refund_usage_counter_idempotent(text, text, text, text, timestamptz)
  from public, anon, authenticated;

grant select, insert, update, delete on public.domain_availability_cache to service_role;
grant select, insert, update, delete on public.bulk_check_jobs to service_role;
grant select, insert, update, delete on public.bulk_check_job_results to service_role;
grant execute on function public.claim_bulk_check_job(uuid, uuid) to service_role;
grant execute on function public.refund_usage_counter_idempotent(text, text, text, text, timestamptz)
  to service_role;

comment on table public.domain_availability_cache is
  'Fifteen-minute, compact domain availability cache. Raw DNS and RDAP payloads are never stored.';
comment on table public.bulk_check_jobs is
  'Server-only durable bulk availability jobs with a four-job global claim gate.';
comment on table public.bulk_check_job_results is
  'Compact availability output for a bulk job; browser access is always via an authenticated server route.';
