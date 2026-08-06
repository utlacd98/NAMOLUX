-- Cover composite ownership foreign keys used by server-side saved-work
-- queries and cascade deletes. These are deliberately narrow complements to
-- the ordering indexes created with the workspace tables.
create index if not exists naming_shortlists_project_user_idx
  on public.naming_shortlists (project_id, user_id);

create index if not exists naming_shortlist_entries_shortlist_user_idx
  on public.naming_shortlist_entries (shortlist_id, user_id);

create index if not exists naming_decision_reports_shortlist_user_idx
  on public.naming_decision_reports (shortlist_id, user_id);

create index if not exists naming_report_share_tokens_report_user_idx
  on public.naming_report_share_tokens (report_id, user_id);

create index if not exists naming_report_share_tokens_user_id_idx
  on public.naming_report_share_tokens (user_id);
