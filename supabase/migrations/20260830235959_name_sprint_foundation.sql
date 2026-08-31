-- Name Sprint trust, evaluation, and learning foundation.
-- Remote migration version: 20260830235959.
--
-- Every table is server-only. Browser roles receive no privileges and no RLS
-- policies. Authenticated product routes must verify ownership before using the
-- service role, and the database repeats user ownership through composite FKs.

create table if not exists public.naming_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  original_description text not null,
  compiled_brief jsonb not null,
  naming_mode text not null default 'distinctive_startup',
  markets text[] not null default '{}'::text[],
  languages text[] not null default '{}'::text[],
  include_terms text[] not null default '{}'::text[],
  exclude_terms text[] not null default '{}'::text[],
  name_sprint_version text not null,
  founder_signal_version text not null,
  collision_registry_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint naming_briefs_description_length_check
    check (char_length(btrim(original_description)) between 30 and 2000),
  constraint naming_briefs_compiled_object_check
    check (jsonb_typeof(compiled_brief) = 'object'),
  constraint naming_briefs_mode_check
    check (naming_mode in (
      'distinctive_startup', 'local_service', 'product_feature', 'premium_luxury',
      'technical_credible', 'consumer_friendly', 'invented_global'
    ))
);

create unique index if not exists naming_briefs_id_user_id_uidx
  on public.naming_briefs (id, user_id);
create index if not exists naming_briefs_user_updated_at_idx
  on public.naming_briefs (user_id, updated_at desc);

create table if not exists public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brief_id uuid not null,
  model text not null,
  prompt_version text not null,
  founder_signal_version text not null,
  collision_registry_version text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_usd numeric(12, 6) not null default 0,
  latency_ms integer,
  retry_count integer not null default 0,
  generated_count integer not null default 0,
  survivor_count integer not null default 0,
  status text not null default 'running',
  failure_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint generation_runs_brief_owner_fkey
    foreign key (brief_id, user_id)
    references public.naming_briefs(id, user_id)
    on delete cascade,
  constraint generation_runs_token_check
    check (input_tokens >= 0 and output_tokens >= 0),
  constraint generation_runs_cost_check
    check (estimated_cost_usd >= 0),
  constraint generation_runs_latency_check
    check (latency_ms is null or latency_ms >= 0),
  constraint generation_runs_retry_check
    check (retry_count between 0 and 2),
  constraint generation_runs_count_check
    check (generated_count >= 0 and survivor_count >= 0 and survivor_count <= generated_count),
  constraint generation_runs_status_check
    check (status in ('running', 'completed', 'failed')),
  constraint generation_runs_completion_check
    check ((status = 'running' and completed_at is null) or (status <> 'running' and completed_at is not null))
);

create unique index if not exists generation_runs_id_user_id_uidx
  on public.generation_runs (id, user_id);
create index if not exists generation_runs_brief_created_at_idx
  on public.generation_runs (brief_id, created_at desc);
create index if not exists generation_runs_user_created_at_idx
  on public.generation_runs (user_id, created_at desc);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  generation_run_id uuid not null,
  display_name text not null,
  normalized_name text not null,
  phonetic_key text not null,
  strategy text not null,
  semantic_territory text not null,
  roots text[] not null default '{}'::text[],
  pronunciation text not null,
  association text not null,
  claimed_origin text,
  origin_verified boolean not null default false,
  internal_genericity_score integer not null default 0,
  eligibility_status text not null,
  hard_failure_codes text[] not null default '{}'::text[],
  eligibility_reasons text[] not null default '{}'::text[],
  provisional_dimensions jsonb,
  final_dimensions jsonb,
  final_founder_signal integer,
  evidence_confidence text,
  was_displayed boolean not null default false,
  display_position integer,
  created_at timestamptz not null default now(),
  constraint candidates_run_owner_fkey
    foreign key (generation_run_id, user_id)
    references public.generation_runs(id, user_id)
    on delete cascade,
  constraint candidates_display_name_length_check
    check (char_length(btrim(display_name)) between 2 and 80),
  constraint candidates_normalized_name_check
    check (normalized_name ~ '^[a-z0-9]{2,80}$'),
  constraint candidates_strategy_check
    check (strategy in ('suggestive', 'metaphorical', 'invented', 'meaningful_compound', 'arbitrary_real_word', 'verified_root')),
  constraint candidates_genericity_check
    check (internal_genericity_score between 0 and 100),
  constraint candidates_eligibility_check
    check (eligibility_status in ('pass', 'review', 'reject')),
  constraint candidates_score_check
    check (final_founder_signal is null or final_founder_signal between 0 and 100),
  constraint candidates_confidence_check
    check (evidence_confidence is null or evidence_confidence in ('high', 'moderate', 'low')),
  constraint candidates_provisional_dimensions_check
    check (provisional_dimensions is null or jsonb_typeof(provisional_dimensions) = 'object'),
  constraint candidates_final_dimensions_check
    check (final_dimensions is null or jsonb_typeof(final_dimensions) = 'object'),
  constraint candidates_display_position_check
    check (display_position is null or display_position between 0 and 100)
);

create unique index if not exists candidates_id_user_id_uidx
  on public.candidates (id, user_id);
create unique index if not exists candidates_run_normalized_name_uidx
  on public.candidates (generation_run_id, normalized_name);
create index if not exists candidates_run_display_idx
  on public.candidates (generation_run_id, was_displayed desc, display_position asc);
create index if not exists candidates_normalized_name_idx
  on public.candidates (normalized_name);
create index if not exists candidates_phonetic_key_idx
  on public.candidates (phonetic_key);
create index if not exists candidates_failure_codes_gin_idx
  on public.candidates using gin (hard_failure_codes);
create index if not exists candidates_roots_gin_idx
  on public.candidates using gin (roots);

create table if not exists public.candidate_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  candidate_id uuid not null,
  check_type text not null,
  source text not null,
  status text not null,
  result jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint candidate_checks_candidate_owner_fkey
    foreign key (candidate_id, user_id)
    references public.candidates(id, user_id)
    on delete cascade,
  constraint candidate_checks_type_check
    check (check_type in ('domain', 'known_brand', 'company', 'trademark_link', 'language', 'search_footprint')),
  constraint candidate_checks_status_check
    check (status in ('clear', 'conflict', 'available', 'unavailable', 'unknown', 'error')),
  constraint candidate_checks_result_object_check
    check (jsonb_typeof(result) = 'object'),
  constraint candidate_checks_expiry_check
    check (expires_at is null or expires_at > checked_at)
);

create index if not exists candidate_checks_candidate_type_checked_idx
  on public.candidate_checks (candidate_id, check_type, checked_at desc);
create index if not exists candidate_checks_expiry_idx
  on public.candidate_checks (expires_at)
  where expires_at is not null;

create table if not exists public.collision_registry (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null,
  display_name text not null,
  alternative_spellings text[] not null default '{}'::text[],
  phonetic_forms text[] not null default '{}'::text[],
  entity_type text not null,
  industries text[] not null default '{}'::text[],
  geographies text[] not null default '{}'::text[],
  fame_level text not null,
  active_status boolean not null default true,
  verification_source text not null,
  registry_version text not null,
  last_checked timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collision_registry_normalized_name_check
    check (normalized_name ~ '^[a-z0-9]{2,80}$'),
  constraint collision_registry_entity_type_check
    check (entity_type in ('brand', 'company', 'product')),
  constraint collision_registry_fame_check
    check (fame_level in ('global', 'national', 'sector', 'limited'))
);

create unique index if not exists collision_registry_normalized_name_uidx
  on public.collision_registry (normalized_name);
create index if not exists collision_registry_phonetic_forms_gin_idx
  on public.collision_registry using gin (phonetic_forms);
create index if not exists collision_registry_industries_gin_idx
  on public.collision_registry using gin (industries);
create index if not exists collision_registry_active_checked_idx
  on public.collision_registry (active_status, last_checked desc);

create table if not exists public.benchmark_cases (
  id uuid primary key default gen_random_uuid(),
  case_key text not null,
  category text not null,
  brief jsonb not null,
  known_good_examples jsonb not null default '[]'::jsonb,
  known_bad_examples jsonb not null default '[]'::jsonb,
  active_brand_traps text[] not null default '{}'::text[],
  expected_failure_codes text[] not null default '{}'::text[],
  source text not null default 'golden-naming-set',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint benchmark_cases_key_length_check
    check (char_length(case_key) between 3 and 120),
  constraint benchmark_cases_brief_object_check
    check (jsonb_typeof(brief) = 'object'),
  constraint benchmark_cases_good_array_check
    check (jsonb_typeof(known_good_examples) = 'array'),
  constraint benchmark_cases_bad_array_check
    check (jsonb_typeof(known_bad_examples) = 'array')
);

create unique index if not exists benchmark_cases_case_key_uidx
  on public.benchmark_cases (case_key);
create index if not exists benchmark_cases_category_active_idx
  on public.benchmark_cases (category, active);

alter table public.name_feedback_events
  add column if not exists name_sprint_candidate_id uuid,
  add column if not exists name_sprint_run_id uuid,
  add column if not exists comparison_candidate_id uuid,
  add column if not exists event_metadata jsonb not null default '{}'::jsonb;

alter table public.name_feedback_events
  drop constraint if exists name_feedback_events_feedback_type_check,
  add constraint name_feedback_events_feedback_type_check check (
    feedback_type in (
      'like', 'dislike', 'more_like_this', 'save', 'unsave', 'copy', 'domain_check', 'selected',
      'reject', 'compare', 'less_literal', 'more_distinctive', 'shorter', 'more_premium',
      'avoid_root', 'export', 'launch_kit'
    )
  ),
  drop constraint if exists name_feedback_events_feedback_reason_check,
  add constraint name_feedback_events_feedback_reason_check check (
    feedback_reason is null or feedback_reason in (
      'too_generic', 'hard_to_pronounce', 'hard_to_spell', 'does_not_fit_business',
      'feels_ai_generated', 'feels_copied', 'too_long', 'wrong_industry', 'wrong_tone',
      'meaning_is_weak', 'too_similar_to_result', 'similar_to_another_brand', 'sounds_cheap',
      'too_artificial', 'dislike_root', 'existing_company_or_brand', 'domain_problem', 'other', 'skip'
    )
  ),
  add constraint name_feedback_events_metadata_object_check
    check (jsonb_typeof(event_metadata) = 'object'),
  add constraint name_feedback_events_name_sprint_candidate_fkey
    foreign key (name_sprint_candidate_id)
    references public.candidates(id)
    on delete set null,
  add constraint name_feedback_events_name_sprint_run_fkey
    foreign key (name_sprint_run_id)
    references public.generation_runs(id)
    on delete set null,
  add constraint name_feedback_events_comparison_candidate_fkey
    foreign key (comparison_candidate_id)
    references public.candidates(id)
    on delete set null;

create index if not exists name_feedback_events_name_sprint_run_idx
  on public.name_feedback_events (name_sprint_run_id, created_at desc)
  where name_sprint_run_id is not null;
create index if not exists name_feedback_events_name_sprint_candidate_idx
  on public.name_feedback_events (name_sprint_candidate_id, created_at desc)
  where name_sprint_candidate_id is not null;

alter table public.naming_briefs enable row level security;
alter table public.generation_runs enable row level security;
alter table public.candidates enable row level security;
alter table public.candidate_checks enable row level security;
alter table public.collision_registry enable row level security;
alter table public.benchmark_cases enable row level security;

revoke all on public.naming_briefs from public, anon, authenticated;
revoke all on public.generation_runs from public, anon, authenticated;
revoke all on public.candidates from public, anon, authenticated;
revoke all on public.candidate_checks from public, anon, authenticated;
revoke all on public.collision_registry from public, anon, authenticated;
revoke all on public.benchmark_cases from public, anon, authenticated;

grant select, insert, update, delete on public.naming_briefs to service_role;
grant select, insert, update, delete on public.generation_runs to service_role;
grant select, insert, update, delete on public.candidates to service_role;
grant select, insert, update, delete on public.candidate_checks to service_role;
grant select, insert, update, delete on public.collision_registry to service_role;
grant select, insert, update, delete on public.benchmark_cases to service_role;

insert into public.collision_registry (
  normalized_name, display_name, entity_type, industries, geographies, fame_level,
  active_status, verification_source, registry_version, last_checked
)
values
  ('anker', 'Anker', 'brand', array['consumer electronics', 'technology', 'hardware'], array['global'], 'global', true, 'https://www.anker.com/', '2026.08.30.1', '2026-08-30T00:00:00Z'),
  ('nucleus', 'Nucleus', 'brand', array['branding', 'marketing', 'business naming', 'digital agency'], array['United Kingdom'], 'sector', true, 'https://www.nucleus.co.uk/', '2026.08.30.1', '2026-08-30T00:00:00Z'),
  ('stripe', 'Stripe', 'brand', array['payments', 'fintech', 'software'], array['global'], 'global', true, 'https://stripe.com/', '2026.08.30.1', '2026-08-30T00:00:00Z'),
  ('gofundme', 'GoFundMe', 'brand', array['fundraising', 'non-profit', 'payments'], array['global'], 'global', true, 'https://www.gofundme.com/', '2026.08.30.1', '2026-08-30T00:00:00Z'),
  ('vantiq', 'Vantiq', 'company', array['software', 'AI'], array['global'], 'sector', true, 'internal-curated-registry', '2026.08.30.1', '2026-08-30T00:00:00Z'),
  ('axoniq', 'AxonIQ', 'company', array['developer tools', 'software'], array['global'], 'sector', true, 'internal-curated-registry', '2026.08.30.1', '2026-08-30T00:00:00Z'),
  ('corteva', 'Corteva', 'company', array['agriculture', 'technology'], array['global'], 'global', true, 'internal-curated-registry', '2026.08.30.1', '2026-08-30T00:00:00Z')
on conflict (normalized_name) do update set
  display_name = excluded.display_name,
  entity_type = excluded.entity_type,
  industries = excluded.industries,
  geographies = excluded.geographies,
  fame_level = excluded.fame_level,
  active_status = excluded.active_status,
  verification_source = excluded.verification_source,
  registry_version = excluded.registry_version,
  last_checked = excluded.last_checked,
  updated_at = now();

comment on table public.naming_briefs is
  'Server-only original and compiled Name Constitutions.';
comment on table public.generation_runs is
  'Name Sprint model, prompt, cost, latency, and quality provenance.';
comment on table public.candidates is
  'Every generated candidate, including private rejection reasons and v2 scoring evidence.';
comment on table public.candidate_checks is
  'Timestamped domain, brand, company, language, and official-register evidence.';
comment on table public.collision_registry is
  'Versioned active-brand and company collision evidence used before Founder Signal.';
comment on table public.benchmark_cases is
  'Private golden naming cases and active-brand traps for regression evaluation.';
