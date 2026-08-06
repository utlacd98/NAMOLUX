create table if not exists public.name_feedback_events (
  id uuid primary key default gen_random_uuid(),
  anonymous_session_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  brief_id text,
  brief_text_snapshot text,
  candidate_id text not null,
  candidate_name text not null,
  candidate_description text,
  candidate_position integer,
  generation_id text not null,
  model_provider text,
  model_name text,
  prompt_version text,
  naming_style text,
  vibe text,
  creativity_level text,
  displayed_scores jsonb,
  domain_availability_snapshot jsonb,
  feedback_type text not null,
  feedback_reason text,
  is_founder_feedback boolean not null default false,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint name_feedback_events_feedback_type_check check (
    feedback_type in (
      'like',
      'dislike',
      'more_like_this',
      'save',
      'unsave',
      'copy',
      'domain_check',
      'selected'
    )
  ),
  constraint name_feedback_events_feedback_reason_check check (
    feedback_reason is null or feedback_reason in (
      'too_generic',
      'hard_to_pronounce',
      'does_not_fit_business',
      'feels_ai_generated',
      'too_long',
      'wrong_tone',
      'similar_to_another_brand',
      'domain_problem',
      'other',
      'skip'
    )
  ),
  constraint name_feedback_events_session_length_check check (char_length(anonymous_session_id) between 8 and 128),
  constraint name_feedback_events_candidate_name_length_check check (char_length(candidate_name) between 2 and 80),
  constraint name_feedback_events_idempotency_key_length_check check (char_length(idempotency_key) between 24 and 160)
);

create unique index if not exists name_feedback_events_idempotency_key_idx
  on public.name_feedback_events (idempotency_key);

create index if not exists name_feedback_events_created_at_idx
  on public.name_feedback_events (created_at desc);

create index if not exists name_feedback_events_session_created_at_idx
  on public.name_feedback_events (anonymous_session_id, created_at desc);

create index if not exists name_feedback_events_type_created_at_idx
  on public.name_feedback_events (feedback_type, created_at desc);

create index if not exists name_feedback_events_style_vibe_idx
  on public.name_feedback_events (naming_style, vibe);

alter table public.name_feedback_events enable row level security;

revoke all on public.name_feedback_events from public, anon, authenticated;
grant all on public.name_feedback_events to service_role;
