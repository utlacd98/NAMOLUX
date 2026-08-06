# NamoLux human-curated naming specialist pilot

This pilot is an offline dataset and founder-review workflow. It does not alter
the public Quick API, production model, runtime fallback chain, deadline,
cancellation, admission, rationale, domain or Founder Signal behaviour.

It also has no network-capable candidate executor and no fine-tuning executor.
That is deliberate: provider capture, uploads, resource provisioning and
training remain explicit founder approval gates.

## What is ready

- 80 new synthetic editorial briefs: 60 train, 10 validation and 10 internal
  test.
- Exactly ten training briefs for each existing NamoLux vibe.
- The agreed training creativity mix and max-length distribution, with locale,
  rhyme and preference/blacklist cases.
- Exact and near-overlap tests against the fixed corpus, balanced-60,
  held-out material and the frozen Namelix benchmark.
- A 36-slot provider-neutral capture schema per brief: 12 slots each for
  `gpt-4.1-mini-2025-04-14`, `gpt-5.6-sol` and
  `qwen/qwen3.6-27b`.
- A source-blind curator pack and a separate private provenance file.
- A localhost-only founder curator with pass-one autosave and a schema that
  already permits a future shuffled pass two.
- Strict 24-name validation and production-contract JSONL export with
  reproducible dataset, prompt, source-curation, excluded-material and manifest
  SHA-256 hashes.
- Inert future fine-tuning profiles. Both file upload and job submission are
  hard-disabled in code.

## Open the founder curator

From `D:\Namolux` run:

```powershell
npm run curator:start
```

Then open:

```text
http://127.0.0.1:3112/namo-curator-local
```

The start script sets `NAMOLUX_LOCAL_CURATOR=1` only for that local process and
binds Next.js to `127.0.0.1`. The page and export endpoint also reject any host
other than `localhost`, `127.0.0.1` or `[::1]`. The route is unlinked, no-index,
excluded from NamoLux engagement tracking and excluded from Vercel Analytics.
Without both the local flag and loopback host it returns 404.

For founder UI review only, a single Vercel preview can opt in with
`NAMOLUX_ENABLE_PREVIEW_CURATOR=1`. That exception works only when
`VERCEL_ENV=preview` and requires a separate temporary access code stored only
in that deployment. A successful code entry sets a 12-hour HttpOnly, Secure,
SameSite=Strict cookie scoped to the curator path. It does not use or change the
NamoLux admin password. Production ignores the preview flags and returns 404.
Real provider packs and final curation remain localhost-only; the remote preview
is for testing the workflow shell.

The 80 briefs are immediately available for inspection. Actual model names are
not yet present because candidate capture would incur provider usage. Once that
separate batch has been approved and captured, import its **source-blind pack**
with `Import blind packs`. Never import the private provenance file into the
curator; the import parser rejects source, provider and model fields.

For each brief:

1. Rate every available name Great, Good, Average or Reject.
2. Mark shortlist and approval separately.
3. Edit the surface when a small human correction makes it stronger.
4. Add any founder-written candidate and its honest brief-specific rationale.
5. Record a concept family and visible affixes for approved names.
6. Flag any critical defect and explain it.
7. Reorder approved names in the right rail.
8. Keep ranks 1–8 as the lead shortlist, 9–16 as strong usable names, and
   17–24 as acceptable names with no critical defect.
9. If 24 names do not honestly clear the bar, select
   `Cannot honestly reach 24` and record the reason. This blocks pass-ready
   status; the workflow never pads.

Progress is autosaved to browser local storage. Use `Back up progress` to save
a portable local JSON backup and `Restore progress` to resume from it.

After every one of the 80 briefs is pass-ready, `Build portable dataset` runs
the frozen-corpus, schema, PII, split, duplicate, affix/family and hash checks
on localhost. It downloads one local package containing separate train,
validation and internal-test JSONL strings and their manifests. The internal
test split is marked `internal_only_never_upload`.

## Candidate capture gate

`buildPilotCandidateCapturePlan()` prepares exactly 240 inert request plans and
2,880 explicit candidate slots. It does not read API keys and cannot execute a
request. The three requested identities are pinned:

| Blind source target | Provider | Requested model | Slots per brief |
|---|---|---|---:|
| Base | OpenAI | `gpt-4.1-mini-2025-04-14` | 12 |
| Strong teacher | OpenAI | `gpt-5.6-sol` | 12 |
| Independent | Groq | `qwen/qwen3.6-27b` | 12 |

Current availability was intentionally not probed because that would be an
external provider operation. Before capture, verify each exact model and quote
the expected cost for all 80 calls. If a target is unavailable, retain its 12
slots as explicit unavailable gaps with a reason. Do not silently substitute.
If the founder approves a closest equivalent, record requested and actual
identities in private provenance and create a new, explicitly versioned capture
profile.

Namelix output is prohibited from this dataset.

## Shared train/serve contract

`lib/domainGen/quickAutoContract.ts` is now the single source for:

- the exact production Auto system and user messages;
- the strict names-only response schema;
- candidate request planning; and
- future fine-tuning JSONL export.

Production still asks for its existing private 24-name longlist in one model
request. Candidate capture uses the same parameterised contract with a count of
12 per source. The extracted representative production request is protected by
a UTF-8 serialized regression hash, so train/serve drift becomes a failing
test.

Each upload-eligible JSONL line has chat messages followed by exactly one
assistant response:

```json
{"messages":[{"role":"system","content":"..."},{"role":"user","content":"..."},{"role":"assistant","content":"{\"names\":[\"exactly\",\"twentyfour\",\"lowercase\",\"names\"]}"}]}
```

The actual assistant array must contain exactly 24 unique lowercase
ASCII-letter names in founder rank order. Scores, rejected names, source
provenance, edits, review state and split administration remain in local
manifests and are never written into training messages.

## Future fine-tuning gate

Preferred future profile:

- Provider: Microsoft Foundry.
- Model: `gpt-4.1-mini-2025-04-14`.
- Method: supervised fine-tuning.
- Seed: `20260715`.
- Intended pilot tier: Developer, after current regional and account support is
  rechecked.

Microsoft currently documents GPT-4.1 mini snapshot `2025-04-14` for SFT and
Developer training. Developer capacity is pre-emptible, has no SLA or data
residency guarantee, and is intended for experimentation. See
[Microsoft's fine-tuning guide](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/fine-tuning)
and [cost-management guide](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/fine-tuning-cost-management).

Fallback provider profile:

- Provider: OpenAI API, contingent on organisation eligibility at approval
  time.
- Model: `gpt-4.1-mini-2025-04-14`.
- Method: supervised fine-tuning.
- Same JSONL and hashes; no provider-specific prompt fork.

The [OpenAI model reference](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
currently lists GPT-4.1 mini fine-tuning support, but account eligibility and
current pricing must still be confirmed before use.

Before any future upload or training job, build a
`FineTuningApprovalPacket`. It refuses to complete without:

- exact provider and model snapshot;
- train, validation and internal-test counts;
- exact token counts and epochs;
- current official price source and price-check time;
- training, hosting and evaluation estimates plus an additive maximum cost;
- dataset, prompt and manifest hashes; and
- explicit founder approval.

No Azure resource, provider file, deployment or training job exists as a result
of this implementation.

## Local verification

```powershell
npm run curator:test
npm run typecheck
```

The local page can then be checked at desktop and mobile widths while the
curator server is running. Candidate capture, a second shuffled review pass,
token counting, a current price quote and the founder's approval are the
remaining prerequisites before any model training discussion.
