# Founder Signal SEO Monitoring — implementation handoff

**Prepared:** 18 July 2026 (Europe/London)
**Workspace:** `D:\Namolux`
**Supabase project:** `ifkxumwgnpiqfoktumtu`
**Current state:** Database migrations are live and verified. Application code is implemented locally but has not been committed, pushed, deployed, or promoted.

## Outcome so far

The paid post-launch Founder Signal SEO monitoring foundation is substantially implemented:

- service-only Supabase persistence for brand projects, monitored sites, audits, page snapshots, durable issues, observations, reports, notification preferences, and cron job runs;
- atomic, lease-protected RPCs for audit claims/completion and cron job claims;
- bounded SSRF-resistant crawler with robots/sitemap handling, DNS/redirect revalidation, strict page/depth/body/time limits, and no form/script/cookie execution;
- deterministic issue detection, scoring, change reporting, and optional PageSpeed integration;
- paid-entitlement gating, historical access for expired users, manual-audit cooldowns, daily/weekly scheduling, retry/idempotency behavior, and partial-crawl safety;
- authenticated API routes and protected Vercel cron routes;
- Founder Signal dashboard states for signed-out, free preview, activation, active monitoring, paused/expired access, reports, issue evidence, trend ranges, settings, loading, empty, and error states;
- responsive/reduced-motion/accessibility treatment and no fabricated performance data.

## Live Supabase work completed

Two migrations were applied successfully:

1. Local file: `supabase/migrations/20260717205031_seo_monitoring_foundation.sql`
   Remote migration name/version: `seo_monitoring_foundation` / `20260717233919`
2. Local file: `supabase/migrations/20260718000500_seo_monitoring_fk_indexes.sql`
   Remote migration name/version: `seo_monitoring_fk_indexes` / `20260717234251`

The first foundation apply initially failed at a stale `COMMENT ON FUNCTION` identity signature. PostgreSQL rolled that attempt back transactionally. The missing `boolean` argument was corrected, and the complete migration then applied successfully.

Post-apply verification proved:

- all 9 expected tables exist and had zero rows immediately after migration;
- RLS is enabled on all 9 tables;
- `anon` and `authenticated` cannot read or write them;
- `service_role` has required CRUD access;
- all 3 RPCs are `SECURITY INVOKER`, have an empty `search_path`, deny browser-role execution, and allow only `service_role`;
- all 13 foreign keys are validated and have covering indexes;
- generated live TypeScript types include the 9 tables, 3 RPCs, and `p_allow_resolutions`;
- Supabase performance advisor reports zero unindexed-foreign-key findings and no warning/error-level performance findings.

Supabase still reports one pre-existing Auth warning: leaked-password protection is disabled. This is unrelated to the SEO migration and should be enabled in Auth settings before the next security release: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

`RLS enabled, no policy` informational notices are intentional for these service-only tables because browser grants are revoked.

### Migration-history note

The Supabase MCP records its own remote timestamp versions, which differ from the local migration filename timestamps. The migration names and SQL are correct, but before switching to a linked Supabase CLI workflow, reconcile or document the version mapping so the CLI does not mistake already-applied migrations for pending ones.

## Main implementation files

### Persistence and server behavior

- `supabase/migrations/20260717205031_seo_monitoring_foundation.sql`
- `supabase/migrations/20260718000500_seo_monitoring_fk_indexes.sql`
- `lib/supabase/database.types.ts`
- `lib/seo-monitoring-access.ts`
- `lib/seo-monitoring-service.ts`

### Monitoring engine

- `lib/seo-monitoring/types.ts`
- `lib/seo-monitoring/network.ts`
- `lib/seo-monitoring/crawler.ts`
- `lib/seo-monitoring/checks.ts`
- `lib/seo-monitoring/issues.ts`
- `lib/seo-monitoring/scoring.ts`
- `lib/seo-monitoring/performance.ts`
- `lib/seo-monitoring/reports.ts`
- `lib/seo-monitoring/engine.ts`
- `lib/seo-monitoring/index.ts`

### API, cron, and UI

- `app/api/founder-signal/seo/route.ts`
- `app/api/founder-signal/seo/sites/route.ts`
- `app/api/founder-signal/seo/sites/[siteId]/route.ts`
- `app/api/founder-signal/seo/sites/[siteId]/audit/route.ts`
- `app/api/founder-signal/seo/issues/[issueId]/route.ts`
- `app/api/cron/seo-daily/route.ts`
- `app/api/cron/seo-weekly/route.ts`
- `components/founder-signal-seo/founder-signal-seo.tsx`
- `components/founder-signal-seo/founder-signal-seo.module.css`
- `components/founder-signal-seo/model.ts`
- `app/founder-signal/page.tsx`
- `.env.example`
- `vercel.json`

## Validation evidence

Completed successfully:

- Focused suite: **9 test files, 45 tests passed**.
- Full TypeScript check: `npm.cmd run typecheck` passed with exit code 0.
- An earlier scoped ESLint run of the new feature passed cleanly.
- Live Supabase schema, ACL, RLS, RPC, foreign-key/index, row-count, generated-type, security-advisor, and performance-advisor checks completed.

Incomplete or interrupted:

- The latest scoped ESLint rerun produced no diagnostic but hit the 10-minute process timeout. Only a SQL migration and one test expectation changed after the earlier clean lint run.
- `npm.cmd run build` was still running silently when the founder asked for this sleep handoff, so it was terminated cleanly. It did not report a code error, but it is **not counted as passed**.
- An earlier whole-suite run passed 68/70 files and 793 tests with 11 skipped; two CPU-heavy generator guards timed out at their local 30-second limits. Both passed when rerun in isolation. Temporary global Vitest timeout/worker changes were removed so ordinary tests are not weakened.
- Rendered desktop/mobile browser QA has not yet run for this feature.
- No preview or production deployment has been made.

### Resume verification update — 18 July 2026

- Rechecked the live Supabase project through the Supabase connector. Remote migrations `20260717233919 seo_monitoring_foundation` and `20260717234251 seo_monitoring_fk_indexes` remain present.
- Re-ran both Supabase advisors. There are still no warning/error-level performance findings. New-table `unused_index` notices are informational and expected while the monitoring tables have no production workload. The only security warning remains the pre-existing disabled leaked-password protection setting. Service-only `RLS enabled, no policy` notices remain intentional.
- A fresh production `next build` passed compilation and TypeScript, then reached Next.js `static-generation`; it remained responsive with active workers but exceeded a 20-minute local cap. The build is therefore inconclusive rather than failed. `.next/diagnostics/build-diagnostics.json` records `buildStage: static-generation` and `.next/trace` shows route checks progressing without a compile diagnostic.
- A fresh full Vitest run completed 70 files: **66 passed**, **790 tests passed**, **11 skipped**, and 4 files reported failures. Three failures were pre-existing CPU-heavy generator guard timeouts under their own fixed 30/60/180-second limits. The fourth was the cancellation latency guard measuring 821 ms under full-suite contention against a 500 ms ceiling.
- The cancellation latency guard passed when isolated: **450 ms**, 1/1 test passed. The balanced-60 guard and generator corpus still exceeded their embedded time ceilings even in isolation on this machine; they produced timeout errors rather than failed quality assertions. Their thresholds and global Vitest configuration were not changed.
- A fresh scoped ESLint attempt remained silent but exceeded six minutes, and its orphaned child process was removed. The earlier clean scoped lint remains the latest conclusive lint result; no lintable feature code changed afterward.
- Attempted a read-only local rendered smoke test at `http://127.0.0.1:3010/founder-signal`. The Next.js dev process stayed alive but did not open the localhost port within the bounded readiness window, so Playwright could not begin. The exact local QA process tree was stopped afterward. Rendered QA therefore remains environment-blocked and incomplete; no production rows were created.
- No files were committed or pushed during this resume run. The later founder-requested preview is documented below and was not promoted.

### Founder test preview — 18 July 2026

- A non-production Vercel preview was created from the current workspace: `https://domainsnipe-azej3yk6p-utlacd98-5423s-projects.vercel.app`.
- Deployment ID: `dpl_26ChiVPJzLWopakmYwv72Uk8T21b`; target `preview`; status `Ready`. Production aliases were not changed.
- Vercel completed the production build in 46 seconds: compilation, TypeScript and all 234 static pages passed.
- Browser smoke testing passed for `/founder-signal`: correct page identity, meaningful rendered content, no framework overlay, zero console warnings/errors, SEO monitoring loading state settled to the signed-out state, and `Sign in to continue` navigated to `/sign-in?redirect=/founder-signal%23seo-monitoring`.
- The read-only `GET /api/founder-signal/seo` boundary passed behind preview protection with HTTP 200 and the expected signed-out contract: `authenticated: false`, `isPro: false`, `accessState: "free"`, empty project/site/audit/report/issue collections, and honest unavailable flags. No database write was attempted.
- Error- and warning-level Vercel runtime-log scans for the preview returned no findings after the page and API checks.
- Cron endpoints were deliberately not invoked during preview QA because an authorization probe could create monitoring side effects if configuration changed. Cron behavior still requires an explicitly authorized non-production test.
- Vercel preview protection is enabled. Testers must be signed into the Vercel project before opening the preview.
- Paid, expired and active-monitoring states remain unverified because no account credentials were entered. The attempted responsive viewport override did not change the in-app browser width, and the Chrome extension connection was unavailable after its permitted retry, so mobile visual QA is still outstanding. Screenshot capture timed out twice, although DOM and console verification succeeded.
- The preview was not promoted to production. No commit or push was made.

## Exact remaining work, in order

1. **Re-run lint in smaller batches** so the machine does not spend ten minutes in one process:
   - engine and service files;
   - API/cron routes;
   - dashboard component and tests.
2. **Re-run the production build** with a generous timeout and capture its final route table:
   - `npm.cmd run build`
3. **Run the full Vitest suite with command-scoped stability options**, not global config changes:
   - `npm.cmd test -- --maxWorkers=2 --testTimeout=90000 --hookTimeout=90000`
   - If the two known generator guards still time out, rerun only those files with one worker and report them separately.
4. **Run rendered QA locally or on a protected preview**:
   - signed-out and free preview;
   - paid activation and URL validation;
   - active monitoring dashboard, trend range switching, issue detail/evidence, report history, and settings;
   - expired/paused account behavior;
   - manual audit cooldown and retry/error states;
   - mobile 375px and desktop layouts;
   - keyboard navigation, focus visibility, screen-reader labels, and reduced motion.
5. **Verify protected cron behavior** with `CRON_SECRET` in a non-production environment, including unauthorized requests, empty batches, continuation cursors, duplicate invocations, lease recovery, and individual-site failure isolation.
6. **Decide optional integrations before deployment**:
   - `PAGESPEED_INSIGHTS_API_KEY` is optional; without it, performance fields stay honestly unavailable;
   - no email sender exists yet, so notification preferences are stored but the UI correctly says delivery is unavailable;
   - set `SEO_CRON_BATCH_SIZE` only if the default bounded batch is unsuitable.
7. **Resolve the local/remote Supabase migration-version mapping** before using linked CLI migration commands.
8. **Deploy to a protected preview only after gates pass**, test there, then ask the founder before any production promotion.

## Required environment values before a preview

- `CRON_SECRET` — required for cron route authorization.
- `PAGESPEED_INSIGHTS_API_KEY` — optional; enables real PageSpeed data.
- `SEO_CRON_BATCH_SIZE` — optional bounded batch override.

The existing Supabase server credentials and billing/entitlement environment must also be present in the preview environment.

## Important boundaries

- Do not claim the application feature is live: only the database migrations are live.
- Do not commit, push, deploy, or promote without the founder asking.
- Do not populate production monitoring rows during tests.
- Preserve service-only table access; do not add browser RLS policies merely to silence the informational advisor.
- Preserve incomplete-crawl behavior: missing issues may only be resolved after a complete crawl.
- Preserve paid entitlement checks and historical read access for expired users.

## Resume point

Start with the three smaller ESLint batches, then rerun `npm.cmd run build`. If both pass, run the full suite with command-scoped timeouts and proceed to protected-preview/browser QA. The database does not need to be migrated again.
