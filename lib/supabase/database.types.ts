export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<{
        id: string
        email: string
        full_name: string | null
        avatar_url: string | null
        plan: string
        entitlement_source: string
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        subscription_status: string | null
        subscription_start: string | null
        subscription_end: string | null
        stripe_status: string | null
        access_expires_at: string | null
        cancel_at_period_end: boolean
        last_stripe_event_created: number | null
        created_at: string | null
        updated_at: string | null
      }, {
        id: string
        email: string
        full_name?: string | null
        avatar_url?: string | null
        plan?: string
        entitlement_source?: string
        stripe_customer_id?: string | null
        stripe_subscription_id?: string | null
        subscription_status?: string | null
        subscription_start?: string | null
        subscription_end?: string | null
        stripe_status?: string | null
        access_expires_at?: string | null
        cancel_at_period_end?: boolean
        last_stripe_event_created?: number | null
        created_at?: string | null
        updated_at?: string | null
      }>
      email_subscribers: Table<{
        id: string
        email: string
        source: string
        tags: string[]
        status: string
        created_at: string
        updated_at: string
      }, {
        id?: string
        email: string
        source?: string
        tags?: string[]
        status?: string
        created_at?: string
        updated_at?: string
      }>
      generation_logs: Table<{
        id: string
        user_id: string | null
        ip_address: string | null
        subject_hash: string | null
        user_agent: string | null
        generation_type: string
        keyword_used: string | null
        results_count: number
        created_at: string
      }, {
        id?: string
        user_id?: string | null
        ip_address?: string | null
        subject_hash?: string | null
        user_agent?: string | null
        generation_type?: string
        keyword_used?: string | null
        results_count?: number
        created_at?: string
      }>
      stripe_events: Table<{
        event_id: string
        type: string
        created: number
        status: string
        attempts: number
        error: string | null
        processed_at: string | null
        created_at: string
        updated_at: string
      }, {
        event_id: string
        type: string
        created: number
        status?: string
        attempts?: number
        error?: string | null
        processed_at?: string | null
        created_at?: string
        updated_at?: string
      }>
      usage_counters: Table<{
        id: string
        subject_type: string
        subject_hash: string
        feature: string
        window_start: string
        reset_at: string
        usage_count: number
        created_at: string
        updated_at: string
      }>
      metric_events: Table<{
        id: string
        action: string
        metadata: Json | null
        user_agent: string | null
        country: string | null
        session_id: string | null
        device: string | null
        referrer: string | null
        route: string | null
        created_at: string
      }, {
        id?: string
        action: string
        metadata?: Json | null
        user_agent?: string | null
        country?: string | null
        session_id?: string | null
        device?: string | null
        referrer?: string | null
        route?: string | null
        created_at?: string
      }>
      name_feedback_events: Table<{
        id: string
        anonymous_session_id: string
        user_id: string | null
        brief_id: string | null
        brief_text_snapshot: string | null
        candidate_id: string
        candidate_name: string
        candidate_description: string | null
        candidate_position: number | null
        generation_id: string
        model_provider: string | null
        model_name: string | null
        prompt_version: string | null
        naming_style: string | null
        vibe: string | null
        creativity_level: string | null
        displayed_scores: Json | null
        domain_availability_snapshot: Json | null
        feedback_type: string
        feedback_reason: string | null
        is_founder_feedback: boolean
        idempotency_key: string
        created_at: string
        updated_at: string
      }, {
        id?: string
        anonymous_session_id: string
        user_id?: string | null
        brief_id?: string | null
        brief_text_snapshot?: string | null
        candidate_id: string
        candidate_name: string
        candidate_description?: string | null
        candidate_position?: number | null
        generation_id: string
        model_provider?: string | null
        model_name?: string | null
        prompt_version?: string | null
        naming_style?: string | null
        vibe?: string | null
        creativity_level?: string | null
        displayed_scores?: Json | null
        domain_availability_snapshot?: Json | null
        feedback_type: string
        feedback_reason?: string | null
        is_founder_feedback?: boolean
        idempotency_key: string
        created_at?: string
        updated_at?: string
      }>
      brand_projects: Table<{
        id: string
        user_id: string
        name: string
        selected_brand_name: string | null
        business_description: string | null
        category: string | null
        locale: string | null
        created_at: string
        updated_at: string
      }, {
        id?: string
        user_id: string
        name: string
        selected_brand_name?: string | null
        business_description?: string | null
        category?: string | null
        locale?: string | null
        created_at?: string
        updated_at?: string
      }>
      naming_shortlists: Table<{
        id: string
        user_id: string
        project_id: string
        title: string
        primary_tld: string
        created_at: string
        updated_at: string
      }, {
        id?: string
        user_id: string
        project_id: string
        title: string
        primary_tld?: string
        created_at?: string
        updated_at?: string
      }>
      naming_shortlist_entries: Table<{
        id: string
        user_id: string
        shortlist_id: string
        candidate_name: string
        primary_domain: string
        availability_snapshot: Json
        founder_signal_snapshot: Json | null
        tier: string | null
        notes: string | null
        position: number
        is_winner: boolean
        created_at: string
        updated_at: string
      }, {
        id?: string
        user_id: string
        shortlist_id: string
        candidate_name: string
        primary_domain: string
        availability_snapshot?: Json
        founder_signal_snapshot?: Json | null
        tier?: string | null
        notes?: string | null
        position?: number
        is_winner?: boolean
        created_at?: string
        updated_at?: string
      }>
      naming_decision_reports: Table<{
        id: string
        user_id: string
        shortlist_id: string
        title: string
        snapshot: Json
        created_at: string
      }, {
        id?: string
        user_id: string
        shortlist_id: string
        title: string
        snapshot: Json
        created_at?: string
      }>
      naming_report_share_tokens: Table<{
        id: string
        user_id: string
        report_id: string
        token_hash: string
        expires_at: string | null
        revoked_at: string | null
        created_at: string
      }, {
        id?: string
        user_id: string
        report_id: string
        token_hash: string
        expires_at?: string | null
        revoked_at?: string | null
        created_at?: string
      }>
      domain_availability_cache: Table<{
        full_domain: string
        status: string
        confidence: string
        provider: string
        checked_at: string
        expires_at: string
        created_at: string
        updated_at: string
      }, {
        full_domain: string
        status: string
        confidence: string
        provider?: string
        checked_at?: string
        expires_at: string
        created_at?: string
        updated_at?: string
      }>
      bulk_check_jobs: Table<{
        id: string
        user_id: string | null
          subject_type: string
          subject_hash: string
          access_token_hash: string | null
          expires_at: string | null
          idempotency_hash: string
        input_hash: string
        names: Json
        tlds: string[]
        plan: string
        status: string
        attempt_count: number
        worker_token: string | null
        lease_expires_at: string | null
        queue_message_id: string | null
        provider_checks: number
        cached_checks: number
        provider_failures: number
        quota_charged_at: string | null
        quota_refunded_at: string | null
        error_code: string | null
        error_message: string | null
        queued_at: string
        started_at: string | null
        completed_at: string | null
        created_at: string
        updated_at: string
      }, {
        id?: string
        user_id?: string | null
          subject_type: string
          subject_hash: string
          access_token_hash?: string | null
          expires_at?: string | null
          idempotency_hash: string
        input_hash: string
        names: Json
        tlds: string[]
        plan: string
        status?: string
        attempt_count?: number
        worker_token?: string | null
        lease_expires_at?: string | null
        queue_message_id?: string | null
        provider_checks?: number
        cached_checks?: number
        provider_failures?: number
        quota_charged_at?: string | null
        quota_refunded_at?: string | null
        error_code?: string | null
        error_message?: string | null
        queued_at?: string
        started_at?: string | null
        completed_at?: string | null
        created_at?: string
        updated_at?: string
      }>
      bulk_check_job_results: Table<{
        id: string
        job_id: string
        candidate_name: string
        tld: string
        full_domain: string
        status: string
        confidence: string
        provider: string
        checked_at: string
        from_cache: boolean
        created_at: string
        updated_at: string
      }, {
        id?: string
        job_id: string
        candidate_name: string
        tld: string
        full_domain: string
        status: string
        confidence: string
        provider?: string
        checked_at: string
        from_cache?: boolean
        created_at?: string
        updated_at?: string
      }>
      seo_sites: Table<{
        id: string
        user_id: string
        project_id: string
        url: string
        normalized_url: string
        origin: string
        hostname: string
        status: string
        monitoring_enabled: boolean
        pause_reason: string | null
        activated_at: string | null
        last_audit_at: string | null
        next_daily_audit_at: string | null
        next_weekly_report_at: string | null
        lease_token: string | null
        lease_expires_at: string | null
        created_at: string
        updated_at: string
      }, {
        id?: string
        user_id: string
        project_id: string
        url: string
        normalized_url: string
        origin: string
        hostname: string
        status?: string
        monitoring_enabled?: boolean
        pause_reason?: string | null
        activated_at?: string | null
        last_audit_at?: string | null
        next_daily_audit_at?: string | null
        next_weekly_report_at?: string | null
        lease_token?: string | null
        lease_expires_at?: string | null
        created_at?: string
        updated_at?: string
      }>
      seo_audits: Table<{
        id: string
        site_id: string
        audit_type: string
        status: string
        schedule_key: string
        idempotency_key: string
        scheduled_for: string | null
        retry_count: number
        worker_token: string | null
        lease_expires_at: string | null
        overall_score: number | null
        technical_score: number | null
        metadata_score: number | null
        discoverability_score: number | null
        performance_score: number | null
        pages_checked: number
        started_at: string | null
        completed_at: string | null
        error_code: string | null
        error_message: string | null
        summary: Json
        raw_metrics: Json
        created_at: string
        updated_at: string
      }, {
        id?: string
        site_id: string
        audit_type: string
        status?: string
        schedule_key: string
        idempotency_key: string
        scheduled_for?: string | null
        retry_count?: number
        worker_token?: string | null
        lease_expires_at?: string | null
        overall_score?: number | null
        technical_score?: number | null
        metadata_score?: number | null
        discoverability_score?: number | null
        performance_score?: number | null
        pages_checked?: number
        started_at?: string | null
        completed_at?: string | null
        error_code?: string | null
        error_message?: string | null
        summary?: Json
        raw_metrics?: Json
        created_at?: string
        updated_at?: string
      }>
      seo_page_snapshots: Table<{
        id: string
        site_id: string
        audit_id: string
        url: string
        normalized_url: string
        response_status: number | null
        response_time_ms: number | null
        response_bytes: number | null
        title: string | null
        meta_description: string | null
        canonical_url: string | null
        h1_values: Json
        robots_directives: string[]
        word_count: number
        image_count: number
        missing_alt_count: number
        script_count: number
        stylesheet_count: number
        content_hash: string | null
        metadata_hash: string | null
        response_headers: Json
        metrics: Json
        fetch_error_code: string | null
        crawled_at: string
      }, {
        id?: string
        site_id: string
        audit_id: string
        url: string
        normalized_url: string
        response_status?: number | null
        response_time_ms?: number | null
        response_bytes?: number | null
        title?: string | null
        meta_description?: string | null
        canonical_url?: string | null
        h1_values?: Json
        robots_directives?: string[]
        word_count?: number
        image_count?: number
        missing_alt_count?: number
        script_count?: number
        stylesheet_count?: number
        content_hash?: string | null
        metadata_hash?: string | null
        response_headers?: Json
        metrics?: Json
        fetch_error_code?: string | null
        crawled_at?: string
      }>
      seo_issues: Table<{
        id: string
        site_id: string
        fingerprint: string
        check_key: string
        category: string
        severity: string
        status: string
        title: string
        description: string
        why_it_matters: string
        recommendation: string
        evidence: Json
        affected_url: string | null
        first_detected_audit_id: string | null
        last_detected_audit_id: string | null
        first_detected_at: string
        last_detected_at: string
        resolved_at: string | null
        ignored_at: string | null
        created_at: string
        updated_at: string
      }, {
        id?: string
        site_id: string
        fingerprint: string
        check_key: string
        category: string
        severity: string
        status?: string
        title: string
        description: string
        why_it_matters: string
        recommendation: string
        evidence?: Json
        affected_url?: string | null
        first_detected_audit_id?: string | null
        last_detected_audit_id?: string | null
        first_detected_at: string
        last_detected_at: string
        resolved_at?: string | null
        ignored_at?: string | null
        created_at?: string
        updated_at?: string
      }>
      seo_issue_observations: Table<{
        id: string
        site_id: string
        issue_id: string
        audit_id: string
        detected: boolean
        severity: string
        status: string
        evidence: Json
        observed_at: string
      }, {
        id?: string
        site_id: string
        issue_id: string
        audit_id: string
        detected: boolean
        severity: string
        status: string
        evidence?: Json
        observed_at?: string
      }>
      seo_reports: Table<{
        id: string
        site_id: string
        audit_id: string | null
        report_type: string
        period_start: string
        period_end: string
        idempotency_key: string
        title: string
        summary: string
        score_change: number | null
        new_issue_count: number
        resolved_issue_count: number
        outstanding_critical_count: number
        report_data: Json
        created_at: string
      }, {
        id?: string
        site_id: string
        audit_id?: string | null
        report_type: string
        period_start: string
        period_end: string
        idempotency_key: string
        title: string
        summary: string
        score_change?: number | null
        new_issue_count?: number
        resolved_issue_count?: number
        outstanding_critical_count?: number
        report_data?: Json
        created_at?: string
      }>
      seo_notification_preferences: Table<{
        site_id: string
        daily_enabled: boolean
        weekly_enabled: boolean
        email_enabled: boolean
        timezone: string
        created_at: string
        updated_at: string
      }, {
        site_id: string
        daily_enabled?: boolean
        weekly_enabled?: boolean
        email_enabled?: boolean
        timezone?: string
        created_at?: string
        updated_at?: string
      }>
      seo_job_runs: Table<{
        id: string
        job_type: string
        schedule_key: string
        batch_key: string
        idempotency_key: string
        status: string
        cursor: string | null
        processed_count: number
        succeeded_count: number
        failed_count: number
        worker_token: string | null
        lease_expires_at: string | null
        last_error: string | null
        started_at: string | null
        completed_at: string | null
        created_at: string
        updated_at: string
      }, {
        id?: string
        job_type: string
        schedule_key: string
        batch_key: string
        idempotency_key: string
        status?: string
        cursor?: string | null
        processed_count?: number
        succeeded_count?: number
        failed_count?: number
        worker_token?: string | null
        lease_expires_at?: string | null
        last_error?: string | null
        started_at?: string | null
        completed_at?: string | null
        created_at?: string
        updated_at?: string
      }>
      admin_users: Table<{
        user_id: string
        created_at: string
      }, {
        user_id: string
        created_at?: string
      }>
    }
    Views: Record<string, never>
    Functions: {
      consume_usage_counter: {
        Args: {
          p_subject_type: string
          p_subject_hash: string
          p_feature: string
          p_window_start: string
          p_reset_at: string
          p_limit: number
        }
        Returns: { allowed: boolean; used: number }[]
      }
      consume_usage_counter_idempotent: {
        Args: {
          p_subject_type: string
          p_subject_hash: string
          p_feature: string
          p_idempotency_hash: string
          p_window_start: string
          p_reset_at: string
          p_limit: number
        }
        Returns: { allowed: boolean; used: number; replayed: boolean }[]
      }
      refund_usage_counter_idempotent: {
        Args: {
          p_subject_type: string
          p_subject_hash: string
          p_feature: string
          p_idempotency_hash: string
          p_window_start: string
        }
        Returns: boolean
      }
      claim_bulk_check_job: {
        Args: {
          p_job_id: string
          p_worker_token: string
        }
        Returns: { claimed: boolean; reason: string }[]
      }
      claim_seo_audit: {
        Args: {
          p_site_id: string
          p_audit_type: string
          p_schedule_key: string
          p_idempotency_key: string
          p_worker_token: string
          p_lease_seconds?: number
          p_scheduled_for?: string | null
        }
        Returns: Json
      }
      complete_seo_audit: {
        Args: {
          p_audit_id: string
          p_site_id: string
          p_worker_token: string
          p_completed_at: string
          p_status: string
          p_overall_score: number
          p_technical_score: number
          p_metadata_score: number
          p_discoverability_score: number
          p_performance_score: number | null
          p_pages_checked: number
          p_summary: Json
          p_raw_metrics: Json
          p_pages: Json
          p_issues: Json
          p_allow_resolutions?: boolean
          p_report?: Json | null
          p_error_code?: string | null
          p_error_message?: string | null
          p_next_daily_audit_at?: string | null
          p_next_weekly_report_at?: string | null
          p_site_lease_token?: string | null
        }
        Returns: Json
      }
      claim_seo_job_run: {
        Args: {
          p_job_type: string
          p_schedule_key: string
          p_batch_key: string
          p_idempotency_key: string
          p_worker_token: string
          p_lease_seconds?: number
        }
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
