-- Cover Name Sprint ownership foreign keys before production traffic accumulates.

create index if not exists candidate_checks_candidate_owner_idx
  on public.candidate_checks (candidate_id, user_id);

create index if not exists candidate_checks_user_id_idx
  on public.candidate_checks (user_id);

create index if not exists candidates_generation_run_owner_idx
  on public.candidates (generation_run_id, user_id);

create index if not exists candidates_user_id_idx
  on public.candidates (user_id);

create index if not exists generation_runs_brief_owner_idx
  on public.generation_runs (brief_id, user_id);
