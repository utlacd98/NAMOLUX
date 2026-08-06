-- Founder Signal post-launch SEO monitoring foundation.
--
-- These tables are intentionally service-role-only. Authenticated server routes
-- establish the caller with Supabase Auth, verify the existing paid entitlement,
-- and then scope every service query to the authenticated profile. Keeping the
-- crawl evidence and scheduler state off the browser Data API also prevents a
-- compromised client from reading another founder's monitoring history.

create table if not exists public.brand_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  selected_brand_name text,
  business_description text,
  category text,
  locale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_projects_name_length_check
    check (char_length(btrim(name)) between 1 and 120),
  constraint brand_projects_selected_name_length_check
    check (selected_brand_name is null or char_length(btrim(selected_brand_name)) between 1 and 120),
  constraint brand_projects_description_length_check
    check (business_description is null or char_length(business_description) <= 8000),
  constraint brand_projects_category_length_check
    check (category is null or char_length(category) <= 120),
  constraint brand_projects_locale_length_check
    check (locale is null or char_length(locale) <= 64)
);

-- Supports the composite ownership foreign key used by seo_sites.
create unique index if not exists brand_projects_id_user_id_uidx
  on public.brand_projects (id, user_id);

create index if not exists brand_projects_user_updated_at_idx
  on public.brand_projects (user_id, updated_at desc);

create table if not exists public.seo_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null,
  url text not null,
  normalized_url text not null,
  origin text not null,
  hostname text not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'paused', 'error', 'disconnected')),
  monitoring_enabled boolean not null default false,
  pause_reason text,
  activated_at timestamptz,
  last_audit_at timestamptz,
  next_daily_audit_at timestamptz,
  next_weekly_report_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_sites_project_owner_fkey
    foreign key (project_id, user_id)
    references public.brand_projects(id, user_id)
    on delete cascade,
  constraint seo_sites_url_length_check
    check (char_length(url) between 8 and 2048),
  constraint seo_sites_normalized_url_length_check
    check (char_length(normalized_url) between 8 and 2048),
  constraint seo_sites_origin_length_check
    check (char_length(origin) between 8 and 2048),
  constraint seo_sites_hostname_length_check
    check (char_length(hostname) between 1 and 253),
  constraint seo_sites_https_origin_check
    check (origin ~ '^https://'),
  constraint seo_sites_origin_is_root_check
    check (origin ~ '^https://[^/?#@]+$'),
  constraint seo_sites_pause_reason_length_check
    check (pause_reason is null or char_length(pause_reason) <= 240),
  constraint seo_sites_lease_pair_check
    check (
      (lease_token is null and lease_expires_at is null)
      or (lease_token is not null and lease_expires_at is not null)
    )
);

create unique index if not exists seo_sites_user_normalized_url_uidx
  on public.seo_sites (user_id, normalized_url);

-- Monitoring is origin-scoped: a founder may have only one monitor for a
-- canonical HTTPS origin, even if activation was attempted with a different
-- path or trailing slash. The application is responsible for canonicalising
-- the submitted URL to its root origin before insertion.
create unique index if not exists seo_sites_user_origin_uidx
  on public.seo_sites (user_id, origin);

create index if not exists seo_sites_project_id_idx
  on public.seo_sites (project_id);

create index if not exists seo_sites_user_updated_at_idx
  on public.seo_sites (user_id, updated_at desc);

create index if not exists seo_sites_due_daily_idx
  on public.seo_sites (next_daily_audit_at, id)
  where monitoring_enabled = true
    and status = 'active'
    and next_daily_audit_at is not null;

create index if not exists seo_sites_due_weekly_idx
  on public.seo_sites (next_weekly_report_at, id)
  where monitoring_enabled = true
    and status = 'active'
    and next_weekly_report_at is not null;

create index if not exists seo_sites_lease_expiry_idx
  on public.seo_sites (lease_expires_at)
  where lease_expires_at is not null;

create table if not exists public.seo_audits (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.seo_sites(id) on delete cascade,
  audit_type text not null
    check (audit_type in ('initial', 'manual', 'daily', 'weekly')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')),
  schedule_key text not null,
  idempotency_key text not null,
  scheduled_for date,
  retry_count integer not null default 0 check (retry_count >= 0),
  worker_token uuid,
  lease_expires_at timestamptz,
  overall_score smallint check (overall_score between 0 and 100),
  technical_score smallint check (technical_score between 0 and 100),
  metadata_score smallint check (metadata_score between 0 and 100),
  discoverability_score smallint check (discoverability_score between 0 and 100),
  performance_score smallint check (performance_score between 0 and 100),
  pages_checked integer not null default 0 check (pages_checked >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message text,
  summary jsonb not null default '{}'::jsonb,
  raw_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_audits_schedule_key_length_check
    check (char_length(schedule_key) between 1 and 160),
  constraint seo_audits_idempotency_key_length_check
    check (char_length(idempotency_key) between 16 and 200),
  constraint seo_audits_error_code_length_check
    check (error_code is null or char_length(error_code) <= 80),
  constraint seo_audits_error_message_length_check
    check (error_message is null or char_length(error_message) <= 1000),
  constraint seo_audits_summary_object_check
    check (jsonb_typeof(summary) = 'object'),
  constraint seo_audits_raw_metrics_object_check
    check (jsonb_typeof(raw_metrics) = 'object'),
  constraint seo_audits_lease_pair_check
    check (
      (worker_token is null and lease_expires_at is null)
      or (worker_token is not null and lease_expires_at is not null)
    ),
  constraint seo_audits_completed_after_started_check
    check (completed_at is null or started_at is null or completed_at >= started_at)
);

create unique index if not exists seo_audits_id_site_id_uidx
  on public.seo_audits (id, site_id);

create unique index if not exists seo_audits_idempotency_key_uidx
  on public.seo_audits (idempotency_key);

create unique index if not exists seo_audits_site_type_schedule_key_uidx
  on public.seo_audits (site_id, audit_type, schedule_key);

-- A site can have at most one in-flight audit, regardless of whether it was
-- scheduled or requested manually. Retries use the idempotency key above.
create unique index if not exists seo_audits_one_inflight_per_site_uidx
  on public.seo_audits (site_id)
  where status in ('queued', 'running');

create index if not exists seo_audits_site_created_at_idx
  on public.seo_audits (site_id, created_at desc);

create index if not exists seo_audits_site_completed_at_idx
  on public.seo_audits (site_id, completed_at desc)
  where completed_at is not null;

create index if not exists seo_audits_status_created_at_idx
  on public.seo_audits (status, created_at);

create index if not exists seo_audits_inflight_lease_expiry_idx
  on public.seo_audits (lease_expires_at, site_id)
  where status in ('queued', 'running')
    and lease_expires_at is not null;

create table if not exists public.seo_page_snapshots (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null,
  audit_id uuid not null,
  url text not null,
  normalized_url text not null,
  response_status smallint check (response_status between 100 and 599),
  response_time_ms integer check (response_time_ms >= 0),
  response_bytes integer check (response_bytes >= 0),
  title text,
  meta_description text,
  canonical_url text,
  h1_values jsonb not null default '[]'::jsonb,
  robots_directives text[] not null default '{}',
  word_count integer not null default 0 check (word_count >= 0),
  image_count integer not null default 0 check (image_count >= 0),
  missing_alt_count integer not null default 0 check (missing_alt_count >= 0),
  script_count integer not null default 0 check (script_count >= 0),
  stylesheet_count integer not null default 0 check (stylesheet_count >= 0),
  content_hash text,
  metadata_hash text,
  response_headers jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  fetch_error_code text,
  crawled_at timestamptz not null default now(),
  constraint seo_page_snapshots_audit_site_fkey
    foreign key (audit_id, site_id)
    references public.seo_audits(id, site_id)
    on delete cascade,
  constraint seo_page_snapshots_url_length_check
    check (char_length(url) between 8 and 2048),
  constraint seo_page_snapshots_normalized_url_length_check
    check (char_length(normalized_url) between 8 and 2048),
  constraint seo_page_snapshots_title_length_check
    check (title is null or char_length(title) <= 2000),
  constraint seo_page_snapshots_description_length_check
    check (meta_description is null or char_length(meta_description) <= 8000),
  constraint seo_page_snapshots_canonical_length_check
    check (canonical_url is null or char_length(canonical_url) <= 2048),
  constraint seo_page_snapshots_h1_array_check
    check (jsonb_typeof(h1_values) = 'array'),
  constraint seo_page_snapshots_content_hash_check
    check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$'),
  constraint seo_page_snapshots_metadata_hash_check
    check (metadata_hash is null or metadata_hash ~ '^[a-f0-9]{64}$'),
  constraint seo_page_snapshots_headers_object_check
    check (jsonb_typeof(response_headers) = 'object'),
  constraint seo_page_snapshots_metrics_object_check
    check (jsonb_typeof(metrics) = 'object'),
  constraint seo_page_snapshots_fetch_error_length_check
    check (fetch_error_code is null or char_length(fetch_error_code) <= 80)
);

create unique index if not exists seo_page_snapshots_audit_url_uidx
  on public.seo_page_snapshots (audit_id, normalized_url);

create index if not exists seo_page_snapshots_site_url_crawled_idx
  on public.seo_page_snapshots (site_id, normalized_url, crawled_at desc);

create table if not exists public.seo_issues (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.seo_sites(id) on delete cascade,
  fingerprint text not null,
  check_key text not null,
  category text not null
    check (category in ('availability', 'crawlability', 'metadata', 'content', 'mobile', 'technical', 'performance')),
  severity text not null
    check (severity in ('critical', 'high', 'medium', 'low')),
  status text not null default 'new'
    check (status in ('new', 'active', 'improving', 'resolved', 'ignored')),
  title text not null,
  description text not null,
  why_it_matters text not null,
  recommendation text not null,
  evidence jsonb not null default '{}'::jsonb,
  affected_url text,
  first_detected_audit_id uuid,
  last_detected_audit_id uuid,
  first_detected_at timestamptz not null,
  last_detected_at timestamptz not null,
  resolved_at timestamptz,
  ignored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_issues_first_audit_site_fkey
    foreign key (first_detected_audit_id, site_id)
    references public.seo_audits(id, site_id)
    on delete set null (first_detected_audit_id),
  constraint seo_issues_last_audit_site_fkey
    foreign key (last_detected_audit_id, site_id)
    references public.seo_audits(id, site_id)
    on delete set null (last_detected_audit_id),
  constraint seo_issues_fingerprint_check
    check (fingerprint ~ '^[a-f0-9]{64}$'),
  constraint seo_issues_check_key_check
    check (char_length(check_key) between 2 and 120 and check_key ~ '^[a-z0-9_.-]+$'),
  constraint seo_issues_title_length_check
    check (char_length(btrim(title)) between 1 and 240),
  constraint seo_issues_description_length_check
    check (char_length(description) between 1 and 8000),
  constraint seo_issues_why_length_check
    check (char_length(why_it_matters) between 1 and 4000),
  constraint seo_issues_recommendation_length_check
    check (char_length(recommendation) between 1 and 8000),
  constraint seo_issues_evidence_object_check
    check (jsonb_typeof(evidence) = 'object'),
  constraint seo_issues_affected_url_length_check
    check (affected_url is null or char_length(affected_url) <= 2048),
  constraint seo_issues_detected_order_check
    check (last_detected_at >= first_detected_at)
);

create unique index if not exists seo_issues_id_site_id_uidx
  on public.seo_issues (id, site_id);

create unique index if not exists seo_issues_site_fingerprint_uidx
  on public.seo_issues (site_id, fingerprint);

create index if not exists seo_issues_site_status_severity_idx
  on public.seo_issues (site_id, status, severity, last_detected_at desc);

create index if not exists seo_issues_first_audit_idx
  on public.seo_issues (first_detected_audit_id)
  where first_detected_audit_id is not null;

create index if not exists seo_issues_last_audit_idx
  on public.seo_issues (last_detected_audit_id)
  where last_detected_audit_id is not null;

create table if not exists public.seo_issue_observations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null,
  issue_id uuid not null,
  audit_id uuid not null,
  detected boolean not null,
  severity text not null
    check (severity in ('critical', 'high', 'medium', 'low')),
  status text not null
    check (status in ('new', 'active', 'improving', 'resolved', 'ignored')),
  evidence jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  constraint seo_issue_observations_issue_site_fkey
    foreign key (issue_id, site_id)
    references public.seo_issues(id, site_id)
    on delete cascade,
  constraint seo_issue_observations_audit_site_fkey
    foreign key (audit_id, site_id)
    references public.seo_audits(id, site_id)
    on delete cascade,
  constraint seo_issue_observations_evidence_object_check
    check (jsonb_typeof(evidence) = 'object')
);

create unique index if not exists seo_issue_observations_audit_issue_uidx
  on public.seo_issue_observations (audit_id, issue_id);

create index if not exists seo_issue_observations_issue_observed_at_idx
  on public.seo_issue_observations (issue_id, observed_at desc);

create index if not exists seo_issue_observations_site_observed_at_idx
  on public.seo_issue_observations (site_id, observed_at desc);

create table if not exists public.seo_reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.seo_sites(id) on delete cascade,
  audit_id uuid,
  report_type text not null check (report_type in ('daily', 'weekly')),
  period_start date not null,
  period_end date not null,
  idempotency_key text not null,
  title text not null,
  summary text not null,
  score_change smallint check (score_change between -100 and 100),
  new_issue_count integer not null default 0 check (new_issue_count >= 0),
  resolved_issue_count integer not null default 0 check (resolved_issue_count >= 0),
  outstanding_critical_count integer not null default 0 check (outstanding_critical_count >= 0),
  report_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint seo_reports_audit_site_fkey
    foreign key (audit_id, site_id)
    references public.seo_audits(id, site_id)
    on delete set null (audit_id),
  constraint seo_reports_period_order_check
    check (period_end >= period_start),
  constraint seo_reports_idempotency_key_length_check
    check (char_length(idempotency_key) between 16 and 200),
  constraint seo_reports_title_length_check
    check (char_length(btrim(title)) between 1 and 240),
  constraint seo_reports_summary_length_check
    check (char_length(summary) between 1 and 12000),
  constraint seo_reports_data_object_check
    check (jsonb_typeof(report_data) = 'object')
);

create unique index if not exists seo_reports_idempotency_key_uidx
  on public.seo_reports (idempotency_key);

create unique index if not exists seo_reports_site_type_period_uidx
  on public.seo_reports (site_id, report_type, period_start);

create index if not exists seo_reports_site_type_created_at_idx
  on public.seo_reports (site_id, report_type, created_at desc);

create index if not exists seo_reports_audit_id_idx
  on public.seo_reports (audit_id)
  where audit_id is not null;

create table if not exists public.seo_notification_preferences (
  site_id uuid primary key references public.seo_sites(id) on delete cascade,
  daily_enabled boolean not null default true,
  weekly_enabled boolean not null default true,
  email_enabled boolean not null default false,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_notification_preferences_timezone_check
    check (char_length(btrim(timezone)) between 1 and 64)
);

create table if not exists public.seo_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('daily', 'weekly')),
  schedule_key text not null,
  batch_key text not null,
  idempotency_key text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'partial', 'failed')),
  cursor text,
  processed_count integer not null default 0 check (processed_count >= 0),
  succeeded_count integer not null default 0 check (succeeded_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  worker_token uuid,
  lease_expires_at timestamptz,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_job_runs_schedule_key_length_check
    check (char_length(schedule_key) between 1 and 120),
  constraint seo_job_runs_batch_key_length_check
    check (char_length(batch_key) between 1 and 160),
  constraint seo_job_runs_idempotency_key_length_check
    check (char_length(idempotency_key) between 16 and 200),
  constraint seo_job_runs_cursor_length_check
    check (cursor is null or char_length(cursor) <= 500),
  constraint seo_job_runs_error_length_check
    check (last_error is null or char_length(last_error) <= 2000),
  constraint seo_job_runs_lease_pair_check
    check (
      (worker_token is null and lease_expires_at is null)
      or (worker_token is not null and lease_expires_at is not null)
    ),
  constraint seo_job_runs_count_consistency_check
    check (succeeded_count + failed_count <= processed_count),
  constraint seo_job_runs_completed_after_started_check
    check (completed_at is null or started_at is null or completed_at >= started_at)
);

create unique index if not exists seo_job_runs_idempotency_key_uidx
  on public.seo_job_runs (idempotency_key);

create unique index if not exists seo_job_runs_schedule_batch_uidx
  on public.seo_job_runs (job_type, schedule_key, batch_key);

create index if not exists seo_job_runs_status_created_at_idx
  on public.seo_job_runs (status, created_at);

create index if not exists seo_job_runs_lease_expiry_idx
  on public.seo_job_runs (lease_expires_at)
  where lease_expires_at is not null;

-- Atomically create, resume, or reclaim an audit execution. The site row lock
-- serialises all audit claims for one site, while the worker token prevents an
-- expired worker from completing work after another worker has reclaimed it.
create or replace function public.claim_seo_audit(
  p_site_id uuid,
  p_audit_type text,
  p_schedule_key text,
  p_idempotency_key text,
  p_worker_token uuid,
  p_lease_seconds integer default 600,
  p_scheduled_for date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_lease_expires_at timestamptz;
  v_audit public.seo_audits%rowtype;
  v_inflight public.seo_audits%rowtype;
  v_retry_increment integer := 0;
begin
  if p_worker_token is null then
    raise exception using errcode = '22023', message = 'worker token is required';
  end if;
  if p_audit_type not in ('initial', 'manual', 'daily', 'weekly') then
    raise exception using errcode = '22023', message = 'invalid audit type';
  end if;
  if nullif(btrim(p_schedule_key), '') is null
     or nullif(btrim(p_idempotency_key), '') is null then
    raise exception using errcode = '22023', message = 'audit schedule and idempotency keys are required';
  end if;
  if p_lease_seconds < 60 or p_lease_seconds > 3600 then
    raise exception using errcode = '22023', message = 'audit lease must be between 60 and 3600 seconds';
  end if;

  v_lease_expires_at := v_now + make_interval(secs => p_lease_seconds);

  perform 1
  from public.seo_sites
  where id = p_site_id
  for update;
  if not found then
    raise exception using errcode = '23503', message = 'SEO site does not exist';
  end if;

  select *
  into v_audit
  from public.seo_audits
  where idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_audit.site_id <> p_site_id
       or v_audit.audit_type <> p_audit_type
       or v_audit.schedule_key <> p_schedule_key then
      raise exception using errcode = '22023', message = 'idempotency key belongs to another audit';
    end if;

    if v_audit.status in ('completed', 'partial') then
      return jsonb_build_object(
        'claimed', false,
        'disposition', 'replay_complete',
        'audit', to_jsonb(v_audit)
      );
    end if;

    if v_audit.status in ('queued', 'running')
       and v_audit.lease_expires_at > v_now
       and v_audit.worker_token is distinct from p_worker_token then
      return jsonb_build_object(
        'claimed', false,
        'disposition', 'in_progress',
        'audit', to_jsonb(v_audit)
      );
    end if;

    if v_audit.status in ('failed', 'cancelled')
       or (v_audit.status in ('queued', 'running') and v_audit.lease_expires_at <= v_now) then
      v_retry_increment := 1;
    end if;

    if v_retry_increment = 1 then
      select *
      into v_inflight
      from public.seo_audits
      where site_id = p_site_id
        and id <> v_audit.id
        and status in ('queued', 'running')
      for update;

      if found then
        if v_inflight.lease_expires_at is null or v_inflight.lease_expires_at > v_now then
          return jsonb_build_object(
            'claimed', false,
            'disposition', 'site_busy',
            'audit', to_jsonb(v_inflight)
          );
        end if;

        update public.seo_audits
        set status = 'failed',
            worker_token = null,
            lease_expires_at = null,
            completed_at = v_now,
            error_code = 'lease_expired',
            error_message = 'The previous audit worker lease expired before completion.',
            updated_at = v_now
        where id = v_inflight.id;
      end if;
    end if;

    update public.seo_audits
    set status = 'running',
        retry_count = retry_count + v_retry_increment,
        worker_token = p_worker_token,
        lease_expires_at = v_lease_expires_at,
        scheduled_for = coalesce(p_scheduled_for, scheduled_for),
        started_at = case when v_retry_increment = 1 then v_now else coalesce(started_at, v_now) end,
        completed_at = null,
        error_code = null,
        error_message = null,
        updated_at = v_now
    where id = v_audit.id
    returning * into v_audit;

    if v_retry_increment = 1 then
      delete from public.seo_page_snapshots where audit_id = v_audit.id;
      delete from public.seo_issue_observations where audit_id = v_audit.id;
      delete from public.seo_reports where audit_id = v_audit.id;
    end if;

    return jsonb_build_object(
      'claimed', true,
      'disposition', case when v_retry_increment = 1 then 'reclaimed' else 'resumed' end,
      'audit', to_jsonb(v_audit)
    );
  end if;

  select *
  into v_inflight
  from public.seo_audits
  where site_id = p_site_id
    and status in ('queued', 'running')
  for update;

  if found then
    if v_inflight.lease_expires_at > v_now then
      return jsonb_build_object(
        'claimed', false,
        'disposition', 'site_busy',
        'audit', to_jsonb(v_inflight)
      );
    end if;

    update public.seo_audits
    set status = 'failed',
        worker_token = null,
        lease_expires_at = null,
        completed_at = v_now,
        error_code = 'lease_expired',
        error_message = 'The previous audit worker lease expired before completion.',
        updated_at = v_now
    where id = v_inflight.id;
  end if;

  insert into public.seo_audits (
    site_id,
    audit_type,
    status,
    schedule_key,
    idempotency_key,
    scheduled_for,
    worker_token,
    lease_expires_at,
    started_at
  ) values (
    p_site_id,
    p_audit_type,
    'running',
    p_schedule_key,
    p_idempotency_key,
    p_scheduled_for,
    p_worker_token,
    v_lease_expires_at,
    v_now
  )
  returning * into v_audit;

  return jsonb_build_object(
    'claimed', true,
    'disposition', 'created',
    'audit', to_jsonb(v_audit)
  );
end;
$$;

-- Atomically persist every durable artifact produced by a completed crawl.
-- p_pages and p_issues are arrays of database-shaped objects documented in the
-- function comment below. p_report is null or one database-shaped report.
create or replace function public.complete_seo_audit(
  p_audit_id uuid,
  p_site_id uuid,
  p_worker_token uuid,
  p_completed_at timestamptz,
  p_status text,
  p_overall_score smallint,
  p_technical_score smallint,
  p_metadata_score smallint,
  p_discoverability_score smallint,
  p_performance_score smallint,
  p_pages_checked integer,
  p_summary jsonb,
  p_raw_metrics jsonb,
  p_pages jsonb,
  p_issues jsonb,
  p_allow_resolutions boolean default false,
  p_report jsonb default null,
  p_error_code text default null,
  p_error_message text default null,
  p_next_daily_audit_at timestamptz default null,
  p_next_weekly_report_at timestamptz default null,
  p_site_lease_token uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_audit public.seo_audits%rowtype;
  v_issue jsonb;
  v_existing public.seo_issues%rowtype;
  v_issue_id uuid;
  v_issue_status text;
  v_fingerprint text;
  v_severity text;
  v_previous_exists boolean;
  v_detected_fingerprints text[] := array[]::text[];
  v_new_issue_count integer := 0;
  v_resolved_issue_count integer := 0;
  v_outstanding_critical_count integer := 0;
  v_report_saved boolean := false;
  v_report_type text;
  v_report_period_start date;
  v_report_period_end date;
  v_current_site_lease_token uuid;
begin
  if p_worker_token is null then
    raise exception using errcode = '22023', message = 'worker token is required';
  end if;
  if p_status not in ('completed', 'partial') then
    raise exception using errcode = '22023', message = 'completion status must be completed or partial';
  end if;
  if p_completed_at is null then
    raise exception using errcode = '22023', message = 'completion timestamp is required';
  end if;
  if p_pages is null or jsonb_typeof(p_pages) <> 'array' then
    raise exception using errcode = '22023', message = 'pages must be a JSON array';
  end if;
  if p_issues is null or jsonb_typeof(p_issues) <> 'array' then
    raise exception using errcode = '22023', message = 'issues must be a JSON array';
  end if;
  if p_report is not null and jsonb_typeof(p_report) <> 'object' then
    raise exception using errcode = '22023', message = 'report must be a JSON object or null';
  end if;
  if p_summary is null or jsonb_typeof(p_summary) <> 'object'
     or p_raw_metrics is null or jsonb_typeof(p_raw_metrics) <> 'object' then
    raise exception using errcode = '22023', message = 'summary and raw metrics must be JSON objects';
  end if;
  if p_pages_checked <> jsonb_array_length(p_pages) then
    raise exception using errcode = '22023', message = 'pages_checked must equal the page payload length';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_issues) as item(value)
    group by item.value ->> 'fingerprint'
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'issue fingerprints must be unique within an audit';
  end if;

  -- Keep the same site -> audit lock order used by claim_seo_audit so a new
  -- claimant cannot deadlock a worker that is committing its result.
  select lease_token
  into v_current_site_lease_token
  from public.seo_sites
  where id = p_site_id
  for update;
  if not found then
    raise exception using errcode = '23503', message = 'SEO site does not exist';
  end if;
  if p_site_lease_token is not null
     and v_current_site_lease_token is distinct from p_site_lease_token then
    raise exception using errcode = '42501', message = 'site worker no longer owns this lease';
  end if;

  select *
  into v_audit
  from public.seo_audits
  where id = p_audit_id
    and site_id = p_site_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'audit does not exist for this site';
  end if;
  if v_audit.status <> 'running' then
    raise exception using errcode = '55000', message = 'audit is not running';
  end if;
  if v_audit.worker_token is distinct from p_worker_token then
    raise exception using errcode = '42501', message = 'audit worker no longer owns this lease';
  end if;

  -- A reclaimed retry starts from an exact replacement set. These deletes and
  -- every write below roll back together if any payload fails validation.
  delete from public.seo_page_snapshots where audit_id = p_audit_id;
  delete from public.seo_issue_observations where audit_id = p_audit_id;
  delete from public.seo_reports where audit_id = p_audit_id;

  insert into public.seo_page_snapshots (
    site_id,
    audit_id,
    url,
    normalized_url,
    response_status,
    response_time_ms,
    response_bytes,
    title,
    meta_description,
    canonical_url,
    h1_values,
    robots_directives,
    word_count,
    image_count,
    missing_alt_count,
    script_count,
    stylesheet_count,
    content_hash,
    metadata_hash,
    response_headers,
    metrics,
    fetch_error_code,
    crawled_at
  )
  select
    p_site_id,
    p_audit_id,
    page.url,
    page.normalized_url,
    page.response_status,
    page.response_time_ms,
    page.response_bytes,
    page.title,
    page.meta_description,
    page.canonical_url,
    coalesce(page.h1_values, '[]'::jsonb),
    coalesce(page.robots_directives, '{}'::text[]),
    coalesce(page.word_count, 0),
    coalesce(page.image_count, 0),
    coalesce(page.missing_alt_count, 0),
    coalesce(page.script_count, 0),
    coalesce(page.stylesheet_count, 0),
    page.content_hash,
    page.metadata_hash,
    coalesce(page.response_headers, '{}'::jsonb),
    coalesce(page.metrics, '{}'::jsonb),
    page.fetch_error_code,
    coalesce(page.crawled_at, p_completed_at)
  from jsonb_to_recordset(p_pages) as page(
    url text,
    normalized_url text,
    response_status smallint,
    response_time_ms integer,
    response_bytes integer,
    title text,
    meta_description text,
    canonical_url text,
    h1_values jsonb,
    robots_directives text[],
    word_count integer,
    image_count integer,
    missing_alt_count integer,
    script_count integer,
    stylesheet_count integer,
    content_hash text,
    metadata_hash text,
    response_headers jsonb,
    metrics jsonb,
    fetch_error_code text,
    crawled_at timestamptz
  );

  for v_issue in
    select value from jsonb_array_elements(p_issues)
  loop
    v_fingerprint := v_issue ->> 'fingerprint';
    v_severity := v_issue ->> 'severity';
    if v_fingerprint is null or v_fingerprint !~ '^[a-f0-9]{64}$' then
      raise exception using errcode = '22023', message = 'each issue requires a valid fingerprint';
    end if;
    if v_severity not in ('critical', 'high', 'medium', 'low') then
      raise exception using errcode = '22023', message = 'each issue requires a valid severity';
    end if;

    select *
    into v_existing
    from public.seo_issues
    where site_id = p_site_id
      and fingerprint = v_fingerprint
    for update;
    v_previous_exists := found;

    if v_previous_exists and v_existing.status = 'ignored' then
      v_issue_status := 'ignored';
    elsif not v_previous_exists or v_existing.status = 'resolved' then
      v_issue_status := 'new';
      v_new_issue_count := v_new_issue_count + 1;
    elsif (
      case v_severity
        when 'low' then 1 when 'medium' then 2 when 'high' then 3 else 4
      end
    ) < (
      case v_existing.severity
        when 'low' then 1 when 'medium' then 2 when 'high' then 3 else 4
      end
    ) then
      v_issue_status := 'improving';
    else
      v_issue_status := 'active';
    end if;

    if v_previous_exists then
      update public.seo_issues
      set check_key = v_issue ->> 'check_key',
          category = v_issue ->> 'category',
          severity = v_severity,
          status = v_issue_status,
          title = v_issue ->> 'title',
          description = v_issue ->> 'description',
          why_it_matters = v_issue ->> 'why_it_matters',
          recommendation = v_issue ->> 'recommendation',
          evidence = coalesce(v_issue -> 'evidence', '{}'::jsonb),
          affected_url = nullif(v_issue ->> 'affected_url', ''),
          last_detected_audit_id = p_audit_id,
          last_detected_at = p_completed_at,
          resolved_at = null,
          updated_at = p_completed_at
      where id = v_existing.id
      returning id into v_issue_id;
    else
      insert into public.seo_issues (
        site_id,
        fingerprint,
        check_key,
        category,
        severity,
        status,
        title,
        description,
        why_it_matters,
        recommendation,
        evidence,
        affected_url,
        first_detected_audit_id,
        last_detected_audit_id,
        first_detected_at,
        last_detected_at,
        resolved_at,
        ignored_at,
        updated_at
      ) values (
        p_site_id,
        v_fingerprint,
        v_issue ->> 'check_key',
        v_issue ->> 'category',
        v_severity,
        v_issue_status,
        v_issue ->> 'title',
        v_issue ->> 'description',
        v_issue ->> 'why_it_matters',
        v_issue ->> 'recommendation',
        coalesce(v_issue -> 'evidence', '{}'::jsonb),
        nullif(v_issue ->> 'affected_url', ''),
        p_audit_id,
        p_audit_id,
        p_completed_at,
        p_completed_at,
        null,
        null,
        p_completed_at
      )
      returning id into v_issue_id;
    end if;

    insert into public.seo_issue_observations (
      site_id,
      issue_id,
      audit_id,
      detected,
      severity,
      status,
      evidence,
      observed_at
    ) values (
      p_site_id,
      v_issue_id,
      p_audit_id,
      true,
      v_severity,
      v_issue_status,
      coalesce(v_issue -> 'evidence', '{}'::jsonb),
      p_completed_at
    )
    on conflict (audit_id, issue_id) do update
    set detected = excluded.detected,
        severity = excluded.severity,
        status = excluded.status,
        evidence = excluded.evidence,
        observed_at = excluded.observed_at;

    v_detected_fingerprints := array_append(v_detected_fingerprints, v_fingerprint);
    if v_severity = 'critical' then
      v_outstanding_critical_count := v_outstanding_critical_count + 1;
    end if;
  end loop;

  if p_allow_resolutions then
    for v_existing in
      select *
      from public.seo_issues
      where site_id = p_site_id
        and status not in ('resolved', 'ignored')
        and not (fingerprint = any(v_detected_fingerprints))
      for update
    loop
      update public.seo_issues
      set status = 'resolved',
          resolved_at = p_completed_at,
          updated_at = p_completed_at
      where id = v_existing.id;

      insert into public.seo_issue_observations (
        site_id,
        issue_id,
        audit_id,
        detected,
        severity,
        status,
        evidence,
        observed_at
      ) values (
        p_site_id,
        v_existing.id,
        p_audit_id,
        false,
        v_existing.severity,
        'resolved',
        v_existing.evidence,
        p_completed_at
      )
      on conflict (audit_id, issue_id) do update
      set detected = excluded.detected,
          severity = excluded.severity,
          status = excluded.status,
          evidence = excluded.evidence,
          observed_at = excluded.observed_at;

      v_resolved_issue_count := v_resolved_issue_count + 1;
    end loop;
  end if;

  select count(*)::integer
  into v_outstanding_critical_count
  from public.seo_issues
  where site_id = p_site_id
    and severity = 'critical'
    and status not in ('resolved', 'ignored');

  if p_report is not null then
    v_report_type := p_report ->> 'report_type';
    v_report_period_start := (p_report ->> 'period_start')::date;
    v_report_period_end := (p_report ->> 'period_end')::date;
    if v_report_type not in ('daily', 'weekly') then
      raise exception using errcode = '22023', message = 'report_type must be daily or weekly';
    end if;

    delete from public.seo_reports
    where site_id = p_site_id
      and (
        idempotency_key = p_report ->> 'idempotency_key'
        or (report_type = v_report_type and period_start = v_report_period_start)
      );

    insert into public.seo_reports (
      site_id,
      audit_id,
      report_type,
      period_start,
      period_end,
      idempotency_key,
      title,
      summary,
      score_change,
      new_issue_count,
      resolved_issue_count,
      outstanding_critical_count,
      report_data
    ) values (
      p_site_id,
      p_audit_id,
      v_report_type,
      v_report_period_start,
      v_report_period_end,
      p_report ->> 'idempotency_key',
      p_report ->> 'title',
      p_report ->> 'summary',
      nullif(p_report ->> 'score_change', '')::smallint,
      v_new_issue_count,
      v_resolved_issue_count,
      v_outstanding_critical_count,
      coalesce(p_report -> 'report_data', p_report)
    );
    v_report_saved := true;
  end if;

  update public.seo_audits
  set status = p_status,
      worker_token = null,
      lease_expires_at = null,
      overall_score = p_overall_score,
      technical_score = p_technical_score,
      metadata_score = p_metadata_score,
      discoverability_score = p_discoverability_score,
      performance_score = p_performance_score,
      pages_checked = p_pages_checked,
      completed_at = p_completed_at,
      error_code = p_error_code,
      error_message = p_error_message,
      summary = p_summary,
      raw_metrics = p_raw_metrics,
      updated_at = p_completed_at
  where id = p_audit_id
    and site_id = p_site_id
    and status = 'running'
    and worker_token = p_worker_token;

  if not found then
    raise exception using errcode = '40001', message = 'audit lease changed during completion';
  end if;

  update public.seo_sites
  set status = case
        when monitoring_enabled = false or (status = 'paused' and pause_reason = 'user_paused') then 'paused'
        else 'active'
      end,
      pause_reason = case
        when monitoring_enabled = false or (status = 'paused' and pause_reason = 'user_paused')
          then coalesce(pause_reason, 'user_paused')
        else null
      end,
      last_audit_at = p_completed_at,
      next_daily_audit_at = coalesce(p_next_daily_audit_at, next_daily_audit_at),
      next_weekly_report_at = coalesce(p_next_weekly_report_at, next_weekly_report_at),
      lease_token = case
        when p_site_lease_token is not null and lease_token = p_site_lease_token then null
        else lease_token
      end,
      lease_expires_at = case
        when p_site_lease_token is not null and lease_token = p_site_lease_token then null
        else lease_expires_at
      end,
      updated_at = p_completed_at
  where id = p_site_id;

  return jsonb_build_object(
    'audit_id', p_audit_id,
    'status', p_status,
    'new_issue_count', v_new_issue_count,
    'resolved_issue_count', v_resolved_issue_count,
    'outstanding_critical_count', v_outstanding_critical_count,
    'report_saved', v_report_saved
  );
end;
$$;

-- Serialise job acquisition by idempotency key. This closes the select-then-
-- update race and allows a crashed or partial cron batch to be reclaimed after
-- its lease expires without a stale worker later overwriting the new owner.
create or replace function public.claim_seo_job_run(
  p_job_type text,
  p_schedule_key text,
  p_batch_key text,
  p_idempotency_key text,
  p_worker_token uuid,
  p_lease_seconds integer default 600
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_lease_expires_at timestamptz;
  v_job public.seo_job_runs%rowtype;
begin
  if p_worker_token is null then
    raise exception using errcode = '22023', message = 'worker token is required';
  end if;
  if p_job_type not in ('daily', 'weekly') then
    raise exception using errcode = '22023', message = 'invalid SEO job type';
  end if;
  if nullif(btrim(p_schedule_key), '') is null
     or nullif(btrim(p_batch_key), '') is null
     or nullif(btrim(p_idempotency_key), '') is null then
    raise exception using errcode = '22023', message = 'job schedule, batch, and idempotency keys are required';
  end if;
  if p_lease_seconds < 60 or p_lease_seconds > 3600 then
    raise exception using errcode = '22023', message = 'job lease must be between 60 and 3600 seconds';
  end if;
  v_lease_expires_at := v_now + make_interval(secs => p_lease_seconds);

  perform pg_advisory_xact_lock(hashtextextended(
    p_job_type || ':' || p_schedule_key || ':' || p_batch_key,
    0
  ));

  select *
  into v_job
  from public.seo_job_runs
  where idempotency_key = p_idempotency_key
     or (job_type = p_job_type and schedule_key = p_schedule_key and batch_key = p_batch_key)
  for update;

  if found then
    if v_job.job_type <> p_job_type
       or v_job.schedule_key <> p_schedule_key
       or v_job.batch_key <> p_batch_key
       or v_job.idempotency_key <> p_idempotency_key then
      raise exception using errcode = '22023', message = 'idempotency key belongs to another SEO job';
    end if;
    if v_job.status = 'completed' then
      return jsonb_build_object('claimed', false, 'disposition', 'replay_complete', 'job', to_jsonb(v_job));
    end if;
    if v_job.status = 'running'
       and v_job.lease_expires_at > v_now
       and v_job.worker_token is distinct from p_worker_token then
      return jsonb_build_object('claimed', false, 'disposition', 'in_progress', 'job', to_jsonb(v_job));
    end if;

    update public.seo_job_runs
    set status = 'running',
        worker_token = p_worker_token,
        lease_expires_at = v_lease_expires_at,
        last_error = null,
        started_at = v_now,
        completed_at = null,
        updated_at = v_now
    where id = v_job.id
    returning * into v_job;

    return jsonb_build_object('claimed', true, 'disposition', 'reclaimed', 'job', to_jsonb(v_job));
  end if;

  insert into public.seo_job_runs (
    job_type,
    schedule_key,
    batch_key,
    idempotency_key,
    status,
    worker_token,
    lease_expires_at,
    started_at
  ) values (
    p_job_type,
    p_schedule_key,
    p_batch_key,
    p_idempotency_key,
    'running',
    p_worker_token,
    v_lease_expires_at,
    v_now
  )
  returning * into v_job;

  return jsonb_build_object('claimed', true, 'disposition', 'created', 'job', to_jsonb(v_job));
end;
$$;

alter table public.brand_projects enable row level security;
alter table public.seo_sites enable row level security;
alter table public.seo_audits enable row level security;
alter table public.seo_page_snapshots enable row level security;
alter table public.seo_issues enable row level security;
alter table public.seo_issue_observations enable row level security;
alter table public.seo_reports enable row level security;
alter table public.seo_notification_preferences enable row level security;
alter table public.seo_job_runs enable row level security;

revoke all on public.brand_projects from public, anon, authenticated;
revoke all on public.seo_sites from public, anon, authenticated;
revoke all on public.seo_audits from public, anon, authenticated;
revoke all on public.seo_page_snapshots from public, anon, authenticated;
revoke all on public.seo_issues from public, anon, authenticated;
revoke all on public.seo_issue_observations from public, anon, authenticated;
revoke all on public.seo_reports from public, anon, authenticated;
revoke all on public.seo_notification_preferences from public, anon, authenticated;
revoke all on public.seo_job_runs from public, anon, authenticated;

grant select, insert, update, delete on public.brand_projects to service_role;
grant select, insert, update, delete on public.seo_sites to service_role;
grant select, insert, update, delete on public.seo_audits to service_role;
grant select, insert, update, delete on public.seo_page_snapshots to service_role;
grant select, insert, update, delete on public.seo_issues to service_role;
grant select, insert, update, delete on public.seo_issue_observations to service_role;
grant select, insert, update, delete on public.seo_reports to service_role;
grant select, insert, update, delete on public.seo_notification_preferences to service_role;
grant select, insert, update, delete on public.seo_job_runs to service_role;

-- PostgreSQL grants function execution to PUBLIC by default. These RPCs are
-- deliberately reachable only by the server-side service role. They remain
-- SECURITY INVOKER, so the caller's database privileges and RLS posture apply.
revoke all on function public.claim_seo_audit(uuid, text, text, text, uuid, integer, date)
  from public, anon, authenticated;
revoke all on function public.complete_seo_audit(
  uuid, uuid, uuid, timestamptz, text, smallint, smallint, smallint, smallint,
  smallint, integer, jsonb, jsonb, jsonb, jsonb, boolean, jsonb, text, text,
  timestamptz, timestamptz, uuid
) from public, anon, authenticated;
revoke all on function public.claim_seo_job_run(text, text, text, text, uuid, integer)
  from public, anon, authenticated;

grant execute on function public.claim_seo_audit(uuid, text, text, text, uuid, integer, date)
  to service_role;
grant execute on function public.complete_seo_audit(
  uuid, uuid, uuid, timestamptz, text, smallint, smallint, smallint, smallint,
  smallint, integer, jsonb, jsonb, jsonb, jsonb, boolean, jsonb, text, text,
  timestamptz, timestamptz, uuid
) to service_role;
grant execute on function public.claim_seo_job_run(text, text, text, text, uuid, integer)
  to service_role;

comment on table public.brand_projects is
  'User-owned NamoLux brand projects. Accessed only through authenticated server routes.';
comment on table public.seo_sites is
  'Paid Founder Signal website-monitoring configuration and scheduler lease state.';
comment on table public.seo_audits is
  'Retry-safe initial, manual, daily, and weekly SEO audit executions.';
comment on table public.seo_page_snapshots is
  'Bounded per-audit page evidence used for change detection; never browser-readable.';
comment on table public.seo_issues is
  'Current durable SEO issue state, keyed by a stable site-scoped fingerprint.';
comment on table public.seo_issue_observations is
  'Immutable per-audit observations preserving SEO issue history.';
comment on table public.seo_reports is
  'Idempotent founder-friendly daily and weekly SEO reports.';
comment on table public.seo_job_runs is
  'Protected cron batch observability and retry state.';

comment on function public.claim_seo_audit(uuid, text, text, text, uuid, integer, date) is
  'Service-only atomic audit claim. Returns {claimed, disposition, audit}; reclaims failed, cancelled, or lease-expired work by idempotency key.';
comment on function public.complete_seo_audit(
  uuid, uuid, uuid, timestamptz, text, smallint, smallint, smallint, smallint,
  smallint, integer, jsonb, jsonb, jsonb, jsonb, boolean, jsonb, text, text,
  timestamptz, timestamptz, uuid
) is
  'Service-only atomic audit persistence. Pages use snapshot column names; issues require fingerprint/check_key/category/severity/title/description/why_it_matters/recommendation/evidence/affected_url; report requires report_type/period_start/period_end/idempotency_key/title/summary/score_change/report_data.';
comment on function public.claim_seo_job_run(text, text, text, text, uuid, integer) is
  'Service-only atomic cron-job claim. Returns {claimed, disposition, job} and reclaims expired, failed, or partial jobs.';
