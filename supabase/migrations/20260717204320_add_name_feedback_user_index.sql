create index if not exists name_feedback_events_user_id_idx
  on public.name_feedback_events (user_id)
  where user_id is not null;
