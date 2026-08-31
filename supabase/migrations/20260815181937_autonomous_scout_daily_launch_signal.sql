-- Daily Launch Signal and Autonomous Domain Scout persistence.
-- All operational data is server-only: RLS is enabled and browser roles have
-- no privileges. Application routes authenticate and authorise before using
-- the service role.

alter table public.seo_sites
  add column if not exists winner_entry_id uuid,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verified_at timestamptz,
  add column if not exists verification_recheck_at timestamptz,
  add column if not exists access_tier text not null default 'free',
  add column if not exists crawl_page_limit smallint not null default 3;

alter table public.seo_sites
  add constraint seo_sites_winner_owner_fkey
    foreign key (winner_entry_id, user_id)
    references public.naming_shortlist_entries(id, user_id)
    on delete restrict,
  add constraint seo_sites_verification_status_check
    check (verification_status in ('pending', 'verified', 'failed', 'expired')),
  add constraint seo_sites_access_tier_check
    check (access_tier in ('free', 'pro')),
  add constraint seo_sites_crawl_page_limit_check
    check (crawl_page_limit between 1 and 8);

-- Existing paid monitors were already explicitly activated by their owners.
-- Preserve them as trusted legacy connections; every new row defaults pending
-- and must complete a cryptographic challenge before monitoring starts.
update public.seo_sites
set verification_status = 'verified',
    verified_at = coalesce(activated_at, created_at),
    verification_recheck_at = now() + interval '30 days',
    access_tier = 'pro',
    crawl_page_limit = 8
where monitoring_enabled = true;

create index if not exists seo_sites_winner_entry_idx
  on public.seo_sites (winner_entry_id) where winner_entry_id is not null;
create unique index if not exists seo_sites_id_user_id_uidx
  on public.seo_sites (id, user_id);

create table public.seo_site_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  site_id uuid not null,
  method text not null check (method in ('dns_txt', 'meta_tag')),
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  token_hint text not null check (char_length(token_hint) between 4 and 24),
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed', 'expired')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 50),
  last_attempt_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_site_verifications_site_owner_fkey
    foreign key (site_id, user_id) references public.seo_sites(id, user_id) on delete cascade
);

create unique index seo_site_verifications_active_uidx
  on public.seo_site_verifications (site_id)
  where status = 'pending';
create index seo_site_verifications_user_created_idx
  on public.seo_site_verifications (user_id, created_at desc);

create table public.seo_agent_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  site_id uuid not null,
  audit_id uuid not null,
  change_state text not null check (change_state in ('baseline', 'stable', 'material_change', 'partial')),
  priorities jsonb not null default '[]'::jsonb check (jsonb_typeof(priorities) = 'array'),
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  model_used boolean not null default false,
  model_name text,
  model_version text,
  explanation text check (explanation is null or char_length(explanation) <= 6000),
  explained_at timestamptz,
  action_status jsonb not null default '{}'::jsonb check (jsonb_typeof(action_status) = 'object'),
  created_at timestamptz not null default now(),
  constraint seo_agent_assessments_site_owner_fkey
    foreign key (site_id, user_id) references public.seo_sites(id, user_id) on delete cascade,
  constraint seo_agent_assessments_audit_site_fkey
    foreign key (audit_id, site_id) references public.seo_audits(id, site_id) on delete cascade
);

create unique index seo_agent_assessments_audit_uidx on public.seo_agent_assessments (audit_id);
create index seo_agent_assessments_site_created_idx on public.seo_agent_assessments (site_id, created_at desc);

create table public.domain_scout_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brief jsonb not null check (jsonb_typeof(brief) = 'object'),
  preferred_tld text not null check (preferred_tld in ('com', 'io', 'co', 'ai', 'app', 'dev')),
  mode_minutes smallint not null check (mode_minutes in (15, 30, 60)),
  credit_cost smallint not null check (credit_cost in (1, 2, 4)),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'paused', 'completed', 'partial', 'failed', 'cancelled')),
  current_phase text not null default 'normalise'
    check (current_phase in ('normalise', 'generate', 'filter', 'score', 'availability', 'refine', 'complete')),
  max_waves smallint not null check (max_waves in (2, 4, 8)),
  max_candidates smallint not null check (max_candidates in (32, 64, 128)),
  max_availability_checks smallint not null check (max_availability_checks in (192, 384, 768)),
  waves_completed smallint not null default 0 check (waves_completed >= 0),
  candidates_considered smallint not null default 0 check (candidates_considered >= 0),
  availability_checks_used smallint not null default 0 check (availability_checks_used >= 0),
  worker_token uuid,
  lease_expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint domain_scout_runs_lease_pair_check check (
    (worker_token is null and lease_expires_at is null) or
    (worker_token is not null and lease_expires_at is not null)
  )
);

create unique index domain_scout_runs_one_active_user_uidx
  on public.domain_scout_runs (user_id)
  where status in ('queued', 'running', 'paused');
create index domain_scout_runs_status_created_idx on public.domain_scout_runs (status, created_at);
create unique index domain_scout_runs_id_user_id_uidx on public.domain_scout_runs (id, user_id);

create table public.domain_scout_waves (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.domain_scout_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  wave_number smallint not null check (wave_number between 1 and 8),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'partial', 'failed')),
  provider text not null default 'openai',
  model_name text not null default 'gpt-5.6-luna',
  generated_count smallint not null default 0,
  survived_count smallint not null default 0,
  rejected_count smallint not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint domain_scout_waves_run_owner_fkey
    foreign key (run_id, user_id) references public.domain_scout_runs(id, user_id) on delete cascade,
  unique (run_id, wave_number)
);

create unique index domain_scout_waves_id_run_user_uidx on public.domain_scout_waves (id, run_id, user_id);

create table public.domain_scout_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.domain_scout_runs(id) on delete cascade,
  wave_id uuid not null references public.domain_scout_waves(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  candidate_name text not null check (candidate_name ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  rationale text,
  state text not null check (state in ('generated', 'rejected', 'survived', 'partial')),
  rejection_reason text,
  founder_signal jsonb,
  availability jsonb not null default '{}'::jsonb check (jsonb_typeof(availability) = 'object'),
  rank smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint domain_scout_candidates_run_owner_fkey
    foreign key (run_id, user_id) references public.domain_scout_runs(id, user_id) on delete cascade,
  constraint domain_scout_candidates_wave_owner_fkey
    foreign key (wave_id, run_id, user_id) references public.domain_scout_waves(id, run_id, user_id) on delete cascade,
  unique (run_id, candidate_name)
);

create index domain_scout_candidates_run_rank_idx on public.domain_scout_candidates (run_id, rank nulls last, created_at);

create table public.domain_scout_events (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.domain_scout_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  phase text not null,
  event_type text not null,
  message text not null check (char_length(message) between 1 and 500),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  constraint domain_scout_events_run_owner_fkey
    foreign key (run_id, user_id) references public.domain_scout_runs(id, user_id) on delete cascade
);

create index domain_scout_events_run_id_idx on public.domain_scout_events (run_id, id);

alter table public.seo_site_verifications enable row level security;
alter table public.seo_agent_assessments enable row level security;
alter table public.domain_scout_runs enable row level security;
alter table public.domain_scout_waves enable row level security;
alter table public.domain_scout_candidates enable row level security;
alter table public.domain_scout_events enable row level security;

revoke all on public.seo_site_verifications, public.seo_agent_assessments,
  public.domain_scout_runs, public.domain_scout_waves, public.domain_scout_candidates,
  public.domain_scout_events from public, anon, authenticated;

grant select, insert, update, delete on public.seo_site_verifications, public.seo_agent_assessments,
  public.domain_scout_runs, public.domain_scout_waves, public.domain_scout_candidates,
  public.domain_scout_events to service_role;
grant usage, select on sequence public.domain_scout_events_id_seq to service_role;

comment on table public.seo_site_verifications is 'Server-only hashed ownership challenges for Daily Launch Signal.';
comment on table public.seo_agent_assessments is 'Evidence-linked, bounded daily SEO priorities and change state.';
comment on table public.domain_scout_runs is 'Durable, budget-capped Autonomous Domain Scout run state.';
