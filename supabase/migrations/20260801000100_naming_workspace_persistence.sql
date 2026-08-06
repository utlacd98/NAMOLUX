-- Durable, server-only persistence for the NamoLux naming decision workspace.
--
-- These records are intentionally not exposed to browser clients. Server routes
-- must establish the Supabase Auth caller, verify the relevant entitlement, and
-- scope every service-role query to the authenticated profile before touching
-- this data. Public report viewing is authorised by a high-entropy, hashed
-- capability token; raw tokens are never persisted.

create table if not exists public.naming_shortlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null,
  title text not null,
  primary_tld text not null default 'com',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint naming_shortlists_project_owner_fkey
    foreign key (project_id, user_id)
    references public.brand_projects(id, user_id)
    on delete cascade,
  constraint naming_shortlists_title_length_check
    check (char_length(btrim(title)) between 1 and 120),
  constraint naming_shortlists_primary_tld_check
    check (primary_tld in ('com', 'io', 'co', 'ai', 'app', 'dev'))
);

create unique index if not exists naming_shortlists_id_user_id_uidx
  on public.naming_shortlists (id, user_id);

create index if not exists naming_shortlists_project_updated_at_idx
  on public.naming_shortlists (project_id, updated_at desc);

create index if not exists naming_shortlists_user_updated_at_idx
  on public.naming_shortlists (user_id, updated_at desc);

create table if not exists public.naming_shortlist_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shortlist_id uuid not null,
  candidate_name text not null,
  primary_domain text not null,
  availability_snapshot jsonb not null default '{}'::jsonb,
  founder_signal_snapshot jsonb,
  tier text,
  notes text,
  position integer not null default 0,
  is_winner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint naming_shortlist_entries_shortlist_owner_fkey
    foreign key (shortlist_id, user_id)
    references public.naming_shortlists(id, user_id)
    on delete cascade,
  constraint naming_shortlist_entries_candidate_name_check
    check (candidate_name ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  constraint naming_shortlist_entries_primary_domain_check
    check (primary_domain ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(com|io|co|ai|app|dev)$'),
  constraint naming_shortlist_entries_availability_object_check
    check (jsonb_typeof(availability_snapshot) = 'object'),
  constraint naming_shortlist_entries_founder_signal_object_check
    check (founder_signal_snapshot is null or jsonb_typeof(founder_signal_snapshot) = 'object'),
  constraint naming_shortlist_entries_tier_check
    check (tier is null or tier in ('top', 'consider', 'reject')),
  constraint naming_shortlist_entries_notes_length_check
    check (notes is null or char_length(notes) <= 4000),
  constraint naming_shortlist_entries_position_check
    check (position between 0 and 10000)
);

create unique index if not exists naming_shortlist_entries_id_user_id_uidx
  on public.naming_shortlist_entries (id, user_id);

create unique index if not exists naming_shortlist_entries_shortlist_domain_uidx
  on public.naming_shortlist_entries (shortlist_id, primary_domain);

create unique index if not exists naming_shortlist_entries_one_winner_uidx
  on public.naming_shortlist_entries (shortlist_id)
  where is_winner = true;

create index if not exists naming_shortlist_entries_shortlist_position_idx
  on public.naming_shortlist_entries (shortlist_id, position asc, created_at asc);

create index if not exists naming_shortlist_entries_user_updated_at_idx
  on public.naming_shortlist_entries (user_id, updated_at desc);

create table if not exists public.naming_decision_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shortlist_id uuid not null,
  title text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint naming_decision_reports_shortlist_owner_fkey
    foreign key (shortlist_id, user_id)
    references public.naming_shortlists(id, user_id)
    on delete cascade,
  constraint naming_decision_reports_title_length_check
    check (char_length(btrim(title)) between 1 and 160),
  constraint naming_decision_reports_snapshot_object_check
    check (jsonb_typeof(snapshot) = 'object')
);

create unique index if not exists naming_decision_reports_id_user_id_uidx
  on public.naming_decision_reports (id, user_id);

create index if not exists naming_decision_reports_shortlist_created_at_idx
  on public.naming_decision_reports (shortlist_id, created_at desc);

create index if not exists naming_decision_reports_user_created_at_idx
  on public.naming_decision_reports (user_id, created_at desc);

create table if not exists public.naming_report_share_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_id uuid not null,
  token_hash text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint naming_report_share_tokens_report_owner_fkey
    foreign key (report_id, user_id)
    references public.naming_decision_reports(id, user_id)
    on delete cascade,
  constraint naming_report_share_tokens_hash_format_check
    check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint naming_report_share_tokens_expiry_check
    check (expires_at is null or expires_at > created_at),
  constraint naming_report_share_tokens_revocation_check
    check (revoked_at is null or revoked_at >= created_at)
);

create unique index if not exists naming_report_share_tokens_token_hash_uidx
  on public.naming_report_share_tokens (token_hash);

create index if not exists naming_report_share_tokens_report_created_at_idx
  on public.naming_report_share_tokens (report_id, created_at desc);

create index if not exists naming_report_share_tokens_active_expiry_idx
  on public.naming_report_share_tokens (expires_at)
  where revoked_at is null and expires_at is not null;

-- Every table remains a protected persistence boundary. No policies are added
-- because browser roles have no table privileges; authenticated server routes
-- use the service role only after their own auth and ownership checks.
alter table public.naming_shortlists enable row level security;
alter table public.naming_shortlist_entries enable row level security;
alter table public.naming_decision_reports enable row level security;
alter table public.naming_report_share_tokens enable row level security;

revoke all on public.naming_shortlists from public, anon, authenticated;
revoke all on public.naming_shortlist_entries from public, anon, authenticated;
revoke all on public.naming_decision_reports from public, anon, authenticated;
revoke all on public.naming_report_share_tokens from public, anon, authenticated;

grant select, insert, update, delete on public.naming_shortlists to service_role;
grant select, insert, update, delete on public.naming_shortlist_entries to service_role;
-- Reports are append-only snapshots. Owners may delete them through the
-- service, but no role used by the application can update a report in place.
-- The project has a default ALL-table grant for service_role, so explicitly
-- remove it before granting the narrow immutable-report privilege set.
revoke all on public.naming_decision_reports from service_role;
grant select, insert, delete on public.naming_decision_reports to service_role;
grant select, insert, update, delete on public.naming_report_share_tokens to service_role;

comment on table public.naming_shortlists is
  'Server-only founder shortlists owned through brand_projects.';
comment on table public.naming_shortlist_entries is
  'Server-only candidate decisions with saved availability and Founder Signal snapshots.';
comment on table public.naming_decision_reports is
  'Immutable, append-only decision report snapshots.';
comment on table public.naming_report_share_tokens is
  'Revocable public-report capabilities; only SHA-256 token hashes are stored.';
