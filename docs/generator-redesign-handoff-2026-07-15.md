# NamoLux Generator Redesign — Work Report

Date: 15 July 2026
Branch: `test/name-generator`
Workspace: `D:\Namolux`

## Executive status

The “Better Than Namelix” generator redesign remains a **NO-GO for release**.
It has not been deployed or promoted. Production is still the known-good Vercel
deployment `dpl_BDBBwkohsLgHK3tpfG1aUSYVoCeh`.

Provider reliability, candidate-first architecture, honest rationale handling,
auth resilience, degraded-provider behaviour and focused automated coverage are
materially stronger. The pure-Sol `rc4` audit achieved six successful provider
calls and 96/96 model names within the latency gate. That does **not** clear the
release gate: raw distinctiveness remains only 5.90–6.93 across the six briefs,
and `Nestegg` duplicated across two niches.

Do not run the 12-brief audit, balanced-60 audit or Namelix benchmark until a
new raw-distinctiveness strategy passes the same fixed six briefs. Agent ratings
in this report are pre-screening evidence, not human review.

No deployment, promotion, commit or push has been made for this work.

## Current implementation

### Candidate-first product architecture

- Quick and ordinary Advanced candidate admission is separated from Founder
  Signal. Founder Signal cannot silently reject, remove or reorder candidates.
- Founder Signal is an explicit later scoring act; score-led admission remains
  reserved for the separately labelled premium Auto-find workflow.
- Domain checks run after names exist and do not remove or reorder candidates.
- Quick includes style and creativity controls, Save, Dislike, More Like This,
  local preference learning, wordmark previews and a post-results decision rail.
- Raw briefs, generated names, provider prose, credentials and raw provider
  messages are not written into analytics.

### Shared result contract

- The client result adapter now imports the canonical `GeneratedName`,
  `AvailabilityState`, `FounderSignalResult`, `NameStyle` and creativity types
  from `lib/domainGen/generatedName.ts` instead of redeclaring weaker copies.
- `auto` remains a generator control only. A server payload that tries to use
  it as a candidate style normalises to `brandable`, so it cannot enter saved
  preferences or result cards as a construction type.
- Unknown availability, confidence and Founder Signal values use explicit
  `null` states instead of omitted fields. Ready scores still preserve an exact
  zero, and optional registrar URLs remain supported.
- The focused adapter/contract suite passed 33/33 and full TypeScript typecheck
  passed. Targeted ESLint completed with zero errors; existing warnings in the
  large generator component remain unrelated to this contract change.

### Exact GPT-5.6 model findings

The tested model identifiers are exact and are not interchangeable:

| Model ID | Evidence |
|---|---|
| `gpt-5.6-luna` | Fastest promising GPT-5.6 path, but the sealed `rc1` six did not clear contribution or raw-quality gates. |
| `gpt-5.6-sol` | Current best quality candidate; used for the pure-provider `rc3` and `rc4` audits. |
| `gpt-5.6-terra` | Returned the observed transient pre-generation HTTP 401 in isolated testing; the bounded retry path is covered with this exact request shape. |
| `gpt-5.6` | The unqualified base alias returned HTTP 404/model-not-found and must not be used as if it resolved to Luna, Sol or Terra. |

GPT-5.6 models use `reasoning_effort: "none"`, low verbosity, no unsupported
sampling fields and the compact strict names-only response. `minimal` is not
sent to GPT-5.6. The checked-in default remains Groq-first with
`gpt-4.1-mini` as the direct OpenAI default; no production model environment
setting has been changed to Sol.

### Bounded OpenAI 401 recovery

Direct OpenAI has one deliberately narrow retry for the transient live anomaly:

- it applies only to HTTP 401 whose safe parsed type is
  `invalid_request_error`;
- it runs at most once and only when at least 2,000ms remains;
- it repeats the same serialized request inside the original AbortController
  and attempt deadline;
- `retryCount` is retained in safe provider-attempt diagnostics on recovered
  success, persistent failure or timeout;
- provider messages, rejected output and credentials are never retained;
- successes, all other HTTP statuses and error types, rate limits, validation
  errors, aborts and timeouts are not retried.

Reasoning-model OpenAI attempts receive a 6.8-second sub-budget inside the one
7.4-second overall model deadline. The remaining roughly 600ms protects local
admission, response serialization and the public eight-second time-to-first-name
target. Non-reasoning OpenAI attempts retain the 6.3-second cap. No fallback or
retry receives an independent extra deadline.

### Provider-first presentation and abstract-name handling

- Auto requests 24 private provider options so local safety admission can reject
  weak alternates, but the public result contract is capped at 16.
- The merge walks admitted provider candidates in provider-ranked order first.
  Deterministic supply only fills a shortfall and never interleaves ahead of the
  provider list.
- Provider names remain subject to hard safety, morphology, pronounceability,
  mirror and visible-family checks.
- The model-only unevidenced/abstract presentation ceiling is relaxed to the full
  16-result cap. A safe, pronounceable abstract name is not displaced merely
  because it lacks a locally reviewed semantic root.
- The suffix relaxation is narrow: a pronounceable abstract form such as the
  covered `mendora` case can survive when it is not a mutated brief root.
  Malformed words, clipped roots, arbitrary suffix mutations, mechanical
  `-ify`/`-io`/`-ly` patterns and unsafe fake constructions remain blocked.

### Honest rationale expansion

- NamoLux, not the model, constructs rationale evidence.
- Locally visible two-part names are now replayed as literal compounds or short
  phrases with their exact construction parts.
- Reviewed per-part associations may be included when genuinely available.
  Unknown model-authored parts remain literal or sound evidence, never invented
  category meaning, etymology or translation.
- Context-only compounds explicitly say their spelling is not evidence of a
  category meaning while still explaining the intended audience and positioning.
- Tests cover visible compounds, zero-fit constructions, provenance validation,
  cross-niche contamination and the absence of internal evidence jargon in
  user-facing copy.
- Audience copy now preserves the exact reviewed audience for practical
  language learning (recent immigrants and their families), while the safari
  profile was tightened to stay within the 65-word rationale readability cap.

### Audit truth separation

- The live-provider audit output is now schema version 3.
- Syntax, count, uniqueness, length, filler, phonetic shape, rationale depth,
  construction truth, provider contribution, latency and cross-niche exact
  duplication remain automated hard gates.
- Deterministic visible-root matching remains recorded as diagnostic evidence,
  but it no longer pretends to prove creative relevance or shortlist quality.
- The normalized mechanical subtotal is calculated before rounding; creative
  relevance and shortlist depth remain explicitly `pending_blind_review`.
- The shared harness owns this split, so audit callers cannot silently diverge
  by copying issue wording or score weights.

### Collision and cross-niche hardening

The latest exact additions are:

- `Overwatch` in the protected-brand set;
- `Reckon`, `Silver Fern` (normalised as `silverfern`), `Tessera`, `Earnest` and
  `Papertrail` in the exact established/same-category collision set;
- `Nestegg` in the cross-niche-default set after rc4 returned it for both family
  budgeting and freelance accounting;
- `Keystone` in the same set after rc5 returned it for both freelance
  accounting and cyber threat analytics;
- `Cushion` in the same set after rc6 returned it for both family budgeting and
  freelance accounting.

These are admission failures regardless of provider style labels. Existing
protections for `Mountain Dew`, `Everpure`, OpenAI variants and the narrow
`lyft` fragment remain. The `war` rule still respects word boundaries:
`Homeward`, `Forward`, `Rewarding` and `Stewardship` remain valid, while `war`,
`cyberwar` and `warzone` remain blocked.

### Auth, result and advertising safety

- Only Quick fails open when Supabase/auth identity lookup throws, and then only
  as anonymous/free. It never grants Pro or paid entitlements.
- The IP burst RPC still applies and fails closed if its database check fails.
- Other paid workflows remain fail-closed.
- Subscription entitlement lookup fails closed.
- Save requires a positively verified available domain; pending, unavailable or
  inconclusive domains cannot be saved and `.com` is never assumed.
- More Like This uses Quick state, Brand Tools use the Quick vibe, Compare Two
  is labelled Pro, and assistive status text distinguishes generation, domain
  checking, scoring and ready states.
- A free Quick ad appears only after the complete results list, followed by
  neutral copy and then the decision rail. Ads remain outside cards and active
  workflows. Pro remains ad-free.

### Ordered Advanced scoring-token binding

A focused acceptance review found that workflow tokens previously signed a
sorted set of names, while the scoring route rebuilt deterministic candidate IDs
from client-supplied order. A caller holding a valid Advanced token could reorder
the same names, recompute order-derived IDs and have the token still verify.

The boundary is now explicit:

- short-lived availability tokens retain their legitimate order-insensitive
  set binding and their existing signature payload;
- Advanced Founder Signal tokens use a separate `ordered` signature domain and
  preserve the exact normalized generation sequence;
- Advanced issuance and batch verification both require ordered binding;
- a reordered shortlist, a legacy set token, a substituted name, a substituted
  candidate ID, a different subject or an expired token is rejected before
  scoring or allowance consumption.

The exploit regression failed before the patch and passed after it. The focused
token, Advanced issuance and scoring-route suite passed 24/24, full TypeScript
typecheck passed, and targeted ESLint completed with zero errors (nine existing
warnings remain in the large generation route).

### Honest degraded-provider behaviour

The new Quick Auto route does not publish a polished-looking fallback page when
provider quality is absent or too thin. A batch with no model contribution or
fewer than eight model candidates returns HTTP 503 with:

- `error: "quick_generation_temporarily_limited"`;
- a safe user-facing retry message;
- `retryable: true`;
- `generationMeta.qualityState: "degraded"`;
- zero published candidates and no workflow token.

The UI clears the active stale result surface, retains the prior batch only in
local history, exposes Retry and restores keyboard focus to the enabled primary
Generate action after React commits the error state. The focus fix uses two
animation frames so it does not target the still-disabled button.

## Verification evidence

### Automated code verification

- The earlier broad focused run passed **293/293 Vitest tests** across provider contracts and retry
  behaviour, generation/merge logic, rationale evidence, hard filters, route
  behaviour, Quick auth resilience, rate-limit behaviour, held-out robustness,
  prompt contracts, the full deterministic quality corpus and result safety.
- After the ordered-token fix, shared-contract consolidation, rc6 removal and
  `Cushion` safeguard, the latest combined affected-path run passed **170/170**
  tests across eight files.
- Full TypeScript typecheck passed.
- `git diff --check` passed.
- Tests prove that the one OpenAI 401 retry stays inside the original deadline,
  stops after one repeat, records only safe diagnostics and does not broaden to
  other failures.
- Direct regression coverage exists for the exact collision and cross-niche
  additions, the 16-result provider-first merge, safe abstract admission,
  visible-compound rationales and the degraded HTTP 503 contract.
- The ordered Advanced scoring-token regression proves that sequence-derived
  candidate IDs cannot be rebound by reordering the signed names, while the
  existing availability continuation remains order-insensitive.

### Mocked browser verification

The focused generator Playwright suite passed **12/12 mocked desktop/mobile
journeys** (six mocked journeys across both viewports). It covers:

- truthful Quick splash and 16 actionable names without Founder Signal;
- Pro entitlement and Quick-vibe Brand Tools;
- explicit-style partial-batch messaging and full rerun cleanup;
- cancellation, focus restoration and stale-response prevention;
- degraded HTTP 503, visible Retry, retained local history, cleared active
  results and successful retry;
- Advanced creative admission separated from optional Founder Signal scoring.

The real-provider Playwright check is separate from those 12 mocked journeys.
Protected-preview auth/checkout transitions, real free/Pro ad visibility,
reduced motion and Lighthouse performance gates still require final candidate
verification after raw name quality passes.

## Sealed quality evidence

### Earlier baselines (`rc1` and `rc2`)

- `luna-six-2026-07-15-rc1`: five of six provider-ready, contribution below the
  90% gate, a `Headroom` cross-niche duplicate and weak raw distinctiveness.
- `sol-six-2026-07-15-rc2`: not a pure-Sol audit because the dotenv command left
  Groq enabled. It mixed deterministic, Groq and OpenAI results, reached only
  83.3% contributed briefs, and all six raw batches failed the blind agent bar.

Both remain **NO-GO** evidence and must not be represented as release passes.

### Pure Sol fixed six (`rc3`)

Artifact directory:
`tests/generator-quality/artifacts/sol-six-2026-07-15-rc3`

The manifest isolated OpenAI, disabled usable Groq/Gateway credentials and used
the exact `gpt-5.6-sol` model:

- five of six Sol calls were ready;
- one call returned HTTP 401 and fell back deterministically;
- 69/96 final names were model-authored (71.9%);
- model-backed/contributed briefs: 5/6 (83.3%);
- p95 duration: 6,351ms;
- cross-niche exact duplicates: 0;
- contribution and per-brief quality gates failed.

The three blind agent pre-raters again exposed the quality problem. AI
scheduling averaged only 2.43/10 distinctiveness, and one agent found no truly
shortlist-worthy option in that batch. Naturalness was materially better than
distinctiveness, confirming that infrastructure and fluency were no longer the
main release blockers. This was agent pre-screening, not human review.

Result: **NO-GO**.

### Pure Sol fixed six (`rc4`)

Artifact directory:
`tests/generator-quality/artifacts/sol-six-2026-07-15-rc4`

This is the cleanest provider evidence so far:

- 6/6 `gpt-5.6-sol` calls ready;
- 96/96 final names model-authored; no deterministic fallback;
- 100% model-backed and model-contributed briefs;
- p95 and maximum duration: 4,996ms;
- one exact cross-niche duplicate: `nestegg` in family budgeting and freelance
  accounting;
- duplicate rate: 1.04%, above the 1% gate;
- the historical schema-v2 artifact reported per-brief failures partly because
  it treated absence of a visible niche root as a creative-quality failure;
  schema v3 now records that signal diagnostically instead. This correction
  does not release rc4: its duplicate/collision evidence and blind
  distinctiveness scores still fail the agreed gate.

Three independent agents blindly pre-rated the names before explanations. The
table shows the mean across the three agents; “minimum shortlist” is the lowest
number any one agent assigned in that brief.

| Brief | Naturalness mean | Distinctiveness mean | Minimum shortlist |
|---|---:|---:|---:|
| Family budgeting | 8.53 | 6.10 | 2 |
| Cozy puzzle studio | 8.73 | 6.90 | 2 |
| Alpine skincare | 8.53 | 6.17 | 2 |
| AI scheduling | 8.57 | 6.27 | 2 |
| Freelance accounting | 8.37 | 5.90 | 2 |
| Cyber threat analytics | 8.60 | 6.93 | 2 |

Across briefs, naturalness averaged 8.37–8.73 and distinctiveness only
5.90–6.93. Every agent could identify at least two shortlist options per brief,
but no brief reached the agreed 8/10 distinctiveness bar. Raters also identified
suffix families, generic metaphor clusters, established-name collisions and the
`Nestegg` duplicate.

These are **agent pre-ratings, not human research or human blind review**. Human
review remains mandatory after a machine/agent gate genuinely passes.

Result: **NO-GO**.

### Pure Sol marginal-novelty experiment (`rc5`)

Artifact directory:
`tests/generator-quality/artifacts/sol-six-2026-07-15-rc5-novelty`

This tested a disabled local portfolio selector that pinned the provider's top
two names, kept 75% provider-rank weight and used 25% marginal surface novelty.
It added no provider call or Founder Signal work. The fixed-six result was:

- 5/6 Sol calls ready; family budgeting timed out;
- 80/96 final names model-authored (83.3% contributed briefs), below 90%;
- p95 7,135ms, above the direct-generator 7,000ms headroom gate;
- `Keystone` duplicated across accounting and cyber, for 1.04%;
- every returned batch passed the schema-v3 objective mechanical checks.

Three fresh independent agents blindly pre-rated only the five valid provider
batches before seeing explanations. Means were:

| Brief | Relevance | Naturalness | Distinctiveness | Vibe | Minimum shortlist |
|---|---:|---:|---:|---:|---:|
| Cozy puzzle studio | 7.67 | 8.10 | 7.27 | 8.17 | 4 |
| Alpine skincare | 8.03 | 7.60 | 7.23 | 8.07 | 4 |
| AI scheduling | 7.13 | 7.97 | 6.33 | 7.17 | 3 |
| Freelance accounting | 6.23 | 7.93 | 6.73 | 6.97 | 2 |
| Cyber threat analytics | 7.20 | 8.40 | 7.23 | 8.17 | 3 |

Against the same five rc4 categories, average distinctiveness rose about 0.52
points while average naturalness fell about 0.56. No batch reached 8/10
distinctiveness, accounting remained weak on relevance and the transport gate
also failed. This was a trade, not a release improvement. The selector and its
flag were removed; only the sealed evidence and `Keystone` safeguard remain.

These are agent pre-ratings, not human research or human blind review.

Result: **NO-GO**.

### Pure Sol reviewed-brief grounding experiment (`rc6`)

Artifact directory:
`tests/generator-quality/artifacts/sol-six-2026-07-15-rc6-grounding`

This tested one final one-call prompt/admission hypothesis: provide the model
with NamoLux's reviewed primary cue, promise and anchors, ask it to discard
theses reusable across unrelated products, and skip only the fourth repeated
semantic metaphor family. Provider order was preserved and no evaluator or
second model call was added.

The fixed-six transport result was:

- 5/6 Sol calls ready; family budgeting timed out and used deterministic supply;
- 80/96 final names model-authored (83.3% contributed briefs), below 90%;
- p95 7,100ms, above the 7,000ms direct-generator headroom gate;
- `Cushion` duplicated across family budgeting and freelance accounting, for
  1.04%;
- every returned batch passed the schema-v3 objective mechanical checks.

Because the provider/contribution, latency and duplication gates failed before
creative review, no blind agent or human quality rating was commissioned. The
experiment and its flag were removed. Only the sealed artifact and the shared
`Cushion` cross-niche safeguard remain.

Result: **NO-GO**.

## Rejected experiments

The following experiments were tested and removed rather than left half-active:

- Auto `{name, territoryId}` output with enforced semantic territory counts;
- revised balanced style quotas that increased padding and construction-family
  repetition;
- stronger prompt/private-bridge variants intended to force ownability, which
  either preserved the same families or traded relevance for generic atmosphere;
- prompt forms that added model-authored explanation metadata;
- rc5 rank-dominant marginal-novelty selection, which traded naturalness for a
  still-insufficient distinctiveness gain and failed transport/duplication gates.
- rc6 reviewed-brief grounding plus semantic-family caps, which kept a single
  call but again failed contribution, latency and cross-niche duplication gates.

The current Auto path is restored to a compact names-only provider response.
NamoLux builds explanations locally. Rejected experiments are negative evidence,
not unfinished features to reactivate without a new hypothesis.

## Release blockers and exact next steps

The active blocker is raw distinctiveness under the current one-call, free-Quick
latency and cost envelope. Prompt-only and local-ranking variants have not
cleared it.

### Specialist-model feasibility check

The recommended one-call route is now more concrete:

- `gpt-5.6-sol` does not currently support fine-tuning, so the successful rc4
  transport configuration cannot itself become the naming specialist.
- `gpt-4.1-mini` does support fine-tuning and is already NamoLux's checked-in
  direct-OpenAI default. A versioned fine-tuned GPT-4.1 mini challenger can
  therefore reuse the present one-call response, cancellation, deadline,
  admission, rationale and result contracts.
- This is only a feasibility finding. No fine-tuning job has been started, no
  training data has been uploaded, no model environment variable has been
  changed and no provider cost has been incurred by this decision.
- The specialist must be trained on human-curated, batch-level shortlists and
  hard negatives, with the fixed six, representative 12 and balanced 60 kept
  out as sealed evaluation data. Synthetic-only training would risk teaching a
  new family of generic defaults rather than solving the quality problem.
- Any challenger must remain preview-only until the same fixed-six quality,
  contribution, collision and latency gates pass. Production retains its
  current provider configuration.

1. Make the next architectural choice explicitly. The recommended route is a
   versioned fine-tuned GPT-4.1 mini naming specialist that preserves the
   one-call eight-second product. The alternative is a multi-stage
   generator/evaluator, which increases cost and latency and therefore requires
   changing the current free-Quick economics/performance contract. Do not
   silently lower the 8/10 gate.
2. After that choice is implemented, run the same fixed six and require all six
   to pass raw relevance,
   pronounceability/naturalness, distinctiveness and vibe at 8/10, with at least
   eight usable and two genuinely shortlist-worthy names per brief, zero critical
   defects, at least 90% model-backed briefs and duplicate rate at or below 1%.
3. Perform blind agent pre-screening before explanations, then obtain genuine
   human blind review. Never describe agent ratings as human review.
4. **Do not run the 12-brief audit, balanced-60 audit or Namelix benchmark until
   the fixed six raw-distinctiveness gate passes.**
5. Only after the quality sequence passes, run protected-preview real-provider,
   authentication, checkout-return, free/Pro ads, failure, keyboard, reduced
   motion and mobile/desktop verification. Enforce Lighthouse ≥90, LCP ≤2.5s,
   TBT ≤200ms and CLS <0.1.
6. Deploy a fresh candidate, verify it production-style and promote that exact
   deployment only when every gate is green.
7. Create the requested social motion graphic after the production generator
   flow is stable, so it depicts the released experience.

## Cleanup and repository safety

- `.env.disable-groq` has been removed.
- Do not print `.env.local`, credentials, request headers or raw provider errors.
- Do not reset or clean the dirty worktree; it contains user-owned and earlier
  task changes outside the generator scope.
- The report file itself remains untracked unless deliberately added later.
- Current Git HEAD remains `a1c0991`; no commit or push was made for this work.
- Production remains `dpl_BDBBwkohsLgHK3tpfG1aUSYVoCeh`; no deployment or
  promotion was made.
- Do not enable Sol/OpenAI-first production generation based on rc4. It passed
  provider reliability and latency, not the release quality gate.

## Official references

- OpenAI latest-model guidance:
  https://developers.openai.com/api/docs/guides/latest-model
- OpenAI Structured Outputs:
  https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI GPT-4.1 mini model capabilities (including fine-tuning support):
  https://developers.openai.com/api/docs/models/gpt-4.1-mini
- OpenAI GPT-5.6 Sol model capabilities (fine-tuning not supported):
  https://developers.openai.com/api/docs/models/gpt-5.6-sol
- OpenAI GPT-5.4 mini:
  https://developers.openai.com/api/docs/models/gpt-5.4-mini
