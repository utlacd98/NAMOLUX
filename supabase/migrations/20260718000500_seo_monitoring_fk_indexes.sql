-- Cover every composite foreign key introduced by the SEO monitoring schema.
-- These indexes keep parent updates/deletes and history joins bounded as audit
-- and observation volumes grow.

create index if not exists seo_issue_observations_audit_site_idx
  on public.seo_issue_observations (audit_id, site_id);

create index if not exists seo_issue_observations_issue_site_idx
  on public.seo_issue_observations (issue_id, site_id);

create index if not exists seo_issues_first_audit_site_idx
  on public.seo_issues (first_detected_audit_id, site_id);

create index if not exists seo_issues_last_audit_site_idx
  on public.seo_issues (last_detected_audit_id, site_id);

create index if not exists seo_page_snapshots_audit_site_idx
  on public.seo_page_snapshots (audit_id, site_id);

create index if not exists seo_reports_audit_site_idx
  on public.seo_reports (audit_id, site_id);

create index if not exists seo_sites_project_owner_idx
  on public.seo_sites (project_id, user_id);
