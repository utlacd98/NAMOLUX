# Blinded generator benchmark: 14 July 2026

This directory freezes both sides of the twelve-case benchmark specified by the generator redesign. The A/B evaluator pack is complete, but it is evidence rather than a declared winner. Three independent blind raters are still required for the creative-quality result.

This is now a **regression benchmark**, not an independent competitive holdout. The 14 July Namelix output and prompts have been available while NamoLux was being tuned. A public claim that the release is better than current Namelix requires a new benchmark version, previously unseen representative prompts, a fresh one-pass capture of both providers, new pack/reveal IDs, and independent raters. The current scripts can recapture only the NamoLux side; fresh Namelix capture remains a separate manual/tooling prerequisite.

## Files

- `capture-manifest.json` freezes the Namelix source: request metadata, request and response hashes, capture times, and the first sixteen unique names in response order.
- `namolux-capture-manifest.json` freezes the local NamoLux source: implementation hash, capture provenance, provider attempts, response hashes, candidate order, rationales, styles, and fit metadata.
- `evaluator-pack.partial.json` is the immutable intermediate pack containing only the first captured source.
- `evaluator-pack.json` is the completed provider-neutral A/B pack. This and a fresh copy of the scorecard are the only files raw-name evaluators should receive.
- `rater-scorecard.template.json` is the empty provider-neutral scorecard. Make one copy for each rater.
- `provider-reveal.json` is the sealed 6/6 A/B reveal. Do not give it to evaluators until every raw-name score is frozen.
- `objective-report.json` contains reproducible contract and heuristic checks. It does not score creative quality.
- `benchmark-protocol.json` freezes the native-control equivalence mappings, scoring ranges, three-rater rule, win definitions, and the 8/12, 10/12 and 10/12 release gates. Changing it creates a new benchmark version; it must not be edited after ratings begin.
- `benchmark.test.ts` validates the immutable Namelix capture, partial pack, order, and reveal.
- `completed-benchmark.test.ts` validates the completed NamoLux capture, response hashes, A/B assembly, blank scorecard, and objective-report consistency.
- `benchmark-harness.test.ts` validates control equivalence, blindness, scorecard schemas, raw-score freezing, finalist selection, independent explanation randomisation, and literal gate aggregation.

The staged command-line workflow is implemented in `scripts/run-namelix-benchmark-harness.ts`. Its pure validation and aggregation engine is `scripts/lib/namelix-benchmark-harness.ts`.

## Live-provider audit evidence

Before freezing a benchmark capture, run the provider audit first over 12 cases and then all 60 cases with one request at a time and a provider-safe delay. Load `.env.local` explicitly; `npx tsx` alone does not load it for standalone scripts.

```powershell
$env:QUICK_AUDIT_LIMIT = "60"
$env:QUICK_AUDIT_BATCH_SIZE = "1"
$env:QUICK_AUDIT_DELAY_MS = "20000"
$env:QUICK_AUDIT_QUIET = "0"
& .\node_modules\.bin\dotenv.cmd -e .env.local -- npx.cmd tsx scripts/audit-quick-generator-model.ts
```

The final JSON line is schema version 2. Its `auditManifest` records the exact generator/rationale implementation hash and file list, Git head/branch/status hash, runtime, credential-presence booleans, model-override-presence booleans, audit settings, attempted model/outcome counts, and successful model counts. It never records credential values or briefs in environment metadata.

A brief counts as meaningfully model-contributed only when at least four of sixteen names and at least 25% of its returned names came from a model. At least 90% of briefs must meet that threshold, and model candidates must comprise at least 25% of the complete audit output. Raw any-model brief rate, model share, fallback share, provider counts, fallback reasons, and every gate remain visible in the summary.

## Current readiness

Run:

```powershell
npx tsx scripts/run-namelix-benchmark-harness.ts check
```

The check validates all twelve native setting pairs, the implementation hash, objective-report provenance, and every objective release gate. At the time this workflow was added, the frozen NamoLux capture had been superseded by later generator edits and its objective report also failed provider, safety, and style gates. The command therefore correctly reports `blocked_by_evidence_mismatch`, leaves every result count and release gate as `null`, and requires a fresh one-pass NamoLux capture from the final implementation. The historical files remain evidence of their recorded snapshot, but are not a claim about the release candidate.

Do not overwrite that historical snapshot. Capture the final implementation into a new run directory:

```powershell
$run = "tests/generator-quality/benchmarks/namelix-2026-07-14/runs/release-candidate"
$env:NAMOLUX_BENCHMARK_OUTPUT_DIR = $run
$env:BENCHMARK_CAPTURE_DELAY_MS = "20000"
& .\node_modules\.bin\dotenv.cmd -e .env.local -- npx.cmd tsx scripts/capture-namolux-benchmark.ts
npx.cmd tsx scripts/run-namelix-benchmark-harness.ts check --run-directory $run
```

The capture script still reads the immutable Namelix source, partial evaluator pack and sealed provider assignment from this directory, while placing the new NamoLux manifest, completed blind pack, objective report and blank scorecard in the selected run directory. It retains the original one-pass/no-replacement rule. Fresh objective reports use schema version 2, bind themselves to the capture and implementation hashes, and apply the same meaningful model-contribution thresholds documented above.

## Capture protocol

The public [Namelix application](https://namelix.com/app/) was inspected read-only. Its UI sent unauthenticated JSON POSTs to `https://namelix.com/generate`. Twelve requests were made sequentially using native style and randomness settings equivalent to the selected NamoLux controls. Domain filtering was disabled because availability must not admit, remove, or reorder raw ideas in this benchmark.

For each Namelix response, the retained list is the first sixteen unique, non-empty `businessName` values in response order. Logo treatments, domains, explanations, and later variants were excluded. Names over the requested length preference were preserved rather than silently filtered.

NamoLux was then captured once per case from the current local working tree through direct sequential calls to `generateGroqQuickCandidates`, with the exact frozen brief, style, creativity, and maximum length. It used a clean derived preference profile, requested sixteen names, and skipped domains and Founder Signal. All returned candidates were retained in generation order. No batch was regenerated, manually filtered, reordered, or replaced. Transport retry counts are zero in all twelve cases.

The twelve cases contain two briefs from each balanced-60 vibe group. Creativity is exactly four Direct, four Balanced, and four Exploratory cases. Auto, Brandable, Evocative, and Compound occur twice; Alternate spelling, Real word, Short phrase, and Non-English occur once.

## Provenance limitations

The original Namelix HTTP response bodies were not retained. Its `normalizedResponseSha256` was calculated over the in-memory response after PowerShell JSON normalization, not the original response bytes. Without that normalized body, the digest is provenance metadata rather than a self-contained, independently replayable proof. Request payloads are retained in full and their canonical payload hashes are reproducible.

An identical Namelix request and seed was repeated once to test reproducibility and returned a different first-sixteen list. The seed is therefore input metadata, not a replay guarantee. Weak batches must not be regenerated or replaced.

The NamoLux capture is tied to a recorded implementation-file hash and dirty local Git state, not a deployed preview URL. The implementation hash includes filtering, generation, provider merge, realness, rationale rendering, and the rationale adapter. It establishes the behavior of that exact local implementation snapshot, not production behavior. Its normalized response bodies are retained as candidate records, so each response hash is independently reproducible.

## Objective NamoLux result

The frozen objective report records:

- 12 cases and 192 candidates; every case has 16 normalized-unique names.
- 10 of 12 model-backed cases (83.3%), below the 90% release target.
- 68 model candidates and 124 fallback candidates (64.6% fallback share).
- two fully deterministic batches and ten Groq-backed batches.
- 6,651 ms p95/max capture duration, within the 8-second Quick target for this sample.
- zero cross-case exact duplicates, zero maximum-length violations, and zero exact same-case overlap with the frozen competitor names.
- 40 names flagged by the existing malformed/unsafe/gibberish heuristics.
- 86 style metadata mismatches in non-Auto cases.

The malformed-name and style checks are automated heuristics, not substitutes for blind human judgment. The style mismatch count is literal metadata-versus-request comparison; it also surfaces the current generator's use of diversified fallback styles under an explicit style selection. These findings must not be hidden, but they do not by themselves decide the competitor winner.

## Blind raw-name scoring

Use three independent raters. Give each rater only `evaluator-pack.json` and an untouched copy of `rater-scorecard.template.json`. Each A/B list is scored out of 50:

| Dimension | Range | Question |
|---|---:|---|
| Relevance | 0-10 | Does the batch fit the exact business, audience, and promise? |
| Pronounceability | 0-10 | Can the intended audience say, hear, and recall the names without repair? |
| Distinctiveness | 0-10 | Does the batch avoid generic, templated, or interchangeable constructions? |
| Control fit | 0-10 | Does it satisfy the requested style and creativity level? |
| Shortlist depth | 0-10 | How many names would a serious founder genuinely retain? |

Each rater also records shortlist-worthy count, top two names, any critical defect, forced preference `A`, `B`, or `Tie`, and confidence. Critical defects are malformed or embarrassing output, unsafe meaning, or a confirmed exact copy of a well-known brand. Run collision checks only after raw scoring so prior brand familiarity does not unblind the creative assessment. This is not legal trademark clearance.

Aggregate numeric scores by median. Pre-registered outcomes are:

- **Outright win:** at least a 3/50 median advantage, at least two of three forced preferences, and no critical defect in the winning batch.
- **Match:** median difference within 2/50 and no critical defect.
- **Match or beat:** median difference at least -2/50.

The release target is at least eight outright NamoLux wins, at least ten matches-or-better, and no NamoLux critical-quality loss.

After three scorecards are complete, freeze and aggregate them with:

```powershell
npx.cmd tsx scripts/run-namelix-benchmark-harness.ts aggregate-raw `
  --run-directory $run `
  --scorecards "$run/ratings/raw-rater-1.json,$run/ratings/raw-rater-2.json,$run/ratings/raw-rater-3.json" `
  --output "$run/ratings/raw-aggregate.json"
```

The harness requires exactly three unique rater IDs, validates every score and finalist against the frozen A/B pack, rejects extra explanation fields and provider-name leakage, and hashes the pack, reveal, captures and scorecards. Reordering the three input paths does not change the resulting `rawFreezeId`.

Each provider's two explanation finalists are chosen without consulting the reveal: first-choice nominations receive two points, second-choice nominations receive one, then ties resolve by nomination count and original frozen batch order. This rule is deterministic and prevents post-reveal cherry-picking.

## Explanation phase

No raw explanation comparison is complete. After raw scores are frozen, take each list's two blind-nominated finalists. Use the captured rationale in `namolux-capture-manifest.json` for NamoLux and request the corresponding name-specific Namelix feedback. Normalize both to plain text, retain A/B labels, and keep providers hidden.

Score each explanation out of 10: brief specificity 0-3; construction and meaning clarity 0-2; audience or positioning usefulness 0-2; non-generic, evidence-honest reasoning 0-2; decision actionability 0-1. An explanation win requires at least a 1/10 median advantage and at least two of three preferences. The release target is ten explanation wins from twelve cases.

Only after the raw aggregate exists may the sealed provider-labelled explanation capture be created:

```powershell
npx.cmd tsx scripts/run-namelix-benchmark-harness.ts prepare-explanations `
  --run-directory $run `
  --raw "$run/ratings/raw-aggregate.json" `
  --output "$run/ratings/sealed-explanation-capture.json"
```

The output includes frozen NamoLux rationales and empty Namelix feedback fields. It must never be sent to evaluators. Capture the two name-specific Namelix explanations per case later, set their source to `name_specific_feedback`, add real capture timestamps, and change the sealed capture status to `complete`. No browsing or provider call is performed by the harness.

Then build a new provider-neutral explanation pack, an independently balanced 6/6 reveal, and a blank scorecard:

```powershell
npx.cmd tsx scripts/run-namelix-benchmark-harness.ts build-explanation-pack `
  --run-directory $run `
  --raw "$run/ratings/raw-aggregate.json" `
  --capture "$run/ratings/sealed-explanation-capture.json" `
  --pack "$run/ratings/explanation-pack.json" `
  --reveal "$run/ratings/explanation-reveal.json" `
  --scorecard "$run/ratings/explanation-scorecard.template.json"
```

This command refuses incomplete feedback, mismatched raw-freeze IDs, missing timestamps, or provider labels inside explanation text. Give only the explanation pack and separate blank scorecards to three independent raters; keep both reveals and the sealed capture private.

Finally aggregate the complete benchmark:

```powershell
npx.cmd tsx scripts/run-namelix-benchmark-harness.ts aggregate-final `
  --run-directory $run `
  --raw "$run/ratings/raw-aggregate.json" `
  --pack "$run/ratings/explanation-pack.json" `
  --reveal "$run/ratings/explanation-reveal.json" `
  --scorecards "$run/ratings/explanation-rater-1.json,$run/ratings/explanation-rater-2.json,$run/ratings/explanation-rater-3.json" `
  --output "$run/ratings/final-report.json"
```

The final report gives exact counts and booleans for eight outright raw-name wins, ten raw matches-or-better, ten explanation wins, and zero critical NamoLux losses. It cannot be produced from templates, partial scorecards, or fewer than three raters.

## What remains human

The following cannot be honestly automated or declared from these files:

1. Three independent blind raw-name ratings and shortlist nominations.
2. Post-rating collision review of nominated names.
3. Namelix explanation capture for the blind-nominated finalists.
4. Three blind explanation ratings.
5. Aggregation against the pre-registered win/match gates.

Until those steps are complete, this regression benchmark has no winner. Even after it passes, a fresh independent two-provider holdout is required before making a current competitive superiority claim.
