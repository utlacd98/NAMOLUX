# NamoLux pricing and cost analysis — 2 August 2026

## 1. Executive summary and final recommendation

**Decision:** keep one paid plan today, but change it to **NamoLux Pro — £9.99/month including UK VAT where NamoLux is required to charge it, or £99/year paid upfront** (17.4% effective annual discount). Do not launch a second paid tier, a trial, or recurring SEO pricing until the generator and monitoring flows pass a separate production-readiness audit.

The live, marketable product is a decision workspace: a founder imports a shortlist, checks six TLDs, applies deterministic Founder Signal scoring, saves evidence, exports CSV, and shares an immutable report. That is useful and very cheap to operate. It is **not yet a full recurring brand/SEO suite**, even though that capability is partly present in the repository. £7.99 is technically profitable under the current feature mix, but it is commercially brittle: 120 full 50-name checks is an unnecessarily high allowance for a solo founder's decision job and there is little recurring value after a name is chosen. £9.99 improves fixed-cost coverage and leaves headroom for quality generation without representing unfinished SEO monitoring as shipped value.

Use a separate **one-time £19 NamoLux Decision Pack** only as an experiment after the similar-names generator is production-ready; it is not a replacement for Pro. If/when SEO monitoring is verified, add a clearly separate **Launch Monitor add-on at £9/month per website** (or introduce a £19.99/month Launch plan). Do not sell either before it is reliable.

### Final pricing decision

- **Recommended free plan:** anonymous/free account, 1 Bulk Check/month (up to 10 names × six TLDs), 1 Founder Signal batch/month (up to 10 names), session draft, no exports/reports.
- **Recommended paid plan or plans:** now: one Pro plan; future only after verification: optional Launch Monitor add-on.
- **Recommended monthly price:** £9.99 incl. VAT where applicable.
- **Recommended annual price:** £99 incl. VAT, paid upfront.
- **VAT treatment:** show UK consumer prices VAT-inclusive; retain net revenue and VAT separately in Stripe. Get tax advice before enabling automated tax in new jurisdictions.
- **Recommended introductory offer:** £7.99/month for the first 12 months for existing £7.99 subscribers; no permanent lifetime offer.
- **Recommended trial:** no free trial initially; the free allowance is the trial. Re-test a seven-day, card-required Pro trial only after activation instrumentation exists.
- **Recommended free-to-paid conversion gate:** export/share/save second project and higher-volume scoring after the user has seen a completed Bulk Check.
- **Primary recurring-value feature:** verified weekly SEO monitoring, not naming alone.
- **Average monthly cost per free user:** £0.03 expected (low £0.01, high £0.12), excluding acquisition and fixed-cost allocation.
- **Average monthly cost per paid user:** £0.16 expected current-surface marginal cost; £0.52 including £35.55/month fixed-cost allocation at 100 payers.
- **Heavy-user monthly cost:** £1.35 expected under recommended Pro guardrails; £3.50 high case if generator becomes included.
- **Expected gross margin:** 93% at £9.99 after assumed 20% VAT, domestic-card/Billing fees and expected COGS; about 89% after £35.55 fixed cost is allocated across 100 payers.
- **Heavy-user gross margin:** about 79% before allocated fixed costs; 75% at 100 payers.
- **Break-even paying customers:** 5 at £9.99 under expected use and £35.55 monthly platform spend; 8 using a £60 fixed-cost contingency.
- **Maximum sustainable free-to-paid ratio:** 55:1 expected at £9.99 before marketing/support, prudently cap planning at 25:1.
- **Most expensive feature:** Deep Search (`gpt-4o`, up to five AI batches) and future scheduled SEO crawling, not Founder Signal.
- **Main cost-control requirement:** authenticated, finite quotas and idempotent requests for every paid model or crawl; no “unlimited” AI or monitoring.
- **Recommended AI model changes:** use Groq `openai/gpt-oss-120b` for quality naming with structured editorial selection; reserve OpenAI `gpt-4.1-mini` for recovery/structured work; retire `gpt-4o` Deep Search from any free path.
- **Confidence level:** medium. Code paths and public list prices were verified; real token, Vercel, Supabase, support, VAT and usage data were not available.
- **Three biggest assumptions:** USD/GBP = 0.79; expected monthly active Pro usage is 4 bulk runs/4 score runs; Vercel Pro and Supabase Pro are the active production plans.
- **Three actions required before launching new pricing:** instrument token/route costs; verify the Stripe price, tax and grandfathering migration in test mode; complete production verification of any generator/SEO feature before putting it on the pricing page.

## 2. Scope, evidence and method

Repository state is the product source of truth. This review inspected `app/`, `components/`, `lib/`, `supabase/migrations/`, `vercel.json`, `.env.example`, plan/entitlement code and public pricing copy. It did not read private environment values, live usage, invoices, Stripe dashboard balances or Supabase/Vercel billing dashboards. Figures marked **estimate** are scenario assumptions, not observed costs. GBP conversion uses **$1 = £0.79**, 2 August 2026.

Official external price research accessed 2 August 2026: [OpenAI GPT-4.1 API announcement](https://openai.com/index/gpt-4-1/), [Groq GPT-OSS 120B](https://console.groq.com/docs/model/openai/gpt-oss-120b), [Groq supported models](https://console.groq.com/docs/models), [Vercel pricing](https://vercel.com/pricing), [Vercel Fluid Compute pricing](https://vercel.com/docs/functions/usage-and-pricing), [Supabase pricing](https://supabase.com/pricing), [Stripe UK pricing](https://stripe.com/gb/pricing), and [Google PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started?hl=en).

## 3. Current product audit

| Area | Evidence | Status | Pricing treatment |
|---|---|---|---|
| Bulk Check | `/bulk-domain-check`, `BulkDecisionWorkspace`, queued `bulk_check_jobs`; up to 50 names × `.com/.io/.co/.ai/.app/.dev` | Production-ready | Core Free/Pro value |
| Founder Signal | server routes `/api/founder-signal/shortlist` and `/batch`; deterministic scorer in `lib/founderSignal` | Production-ready | Core value; low marginal cost |
| Save, compare, CSV, immutable reports/share links | naming-workspace routes/migrations | Production-ready, Pro-gated | Core Pro conversion gate |
| Domain availability | RDAP/DNS providers, cache, queue, Namecheap affiliate links | Production-ready but verification-required outcomes are intentional | Keep metered |
| Quick Generate | `/api/quick-generate`, Groq/OpenAI/Gateway routing; public generator paths lab-blocked by flags | Experimental/lab-gated; quality holds exist | Do not sell in current plan |
| Advanced/legacy generation | `/api/generate-domains`, `generate-names-premium` | Implemented, mixed legacy/experimental surface | Do not promise until consolidated |
| Guided lab generator | `components/lab-name-generator`, `/api/lab/*` | Lab-only | Candidate for Decision Pack after quality evaluation |
| AI Name Chat | `/api/ai-name-chat` uses local candidate engine and live domain lookups; no provider call found | Implemented but not public core | No AI token cost; check availability cost |
| Description analysis | `/api/analyze-description`, `gpt-4o-mini` with deterministic fallback | Implemented, lab-blockable | Keep paid/limited |
| Deep Search | `/api/deep-search`, `gpt-4o`, max five batches | Implemented but expensive/unclear public exposure | Paid credit only |
| Brand palette | `/api/brand-palette`, `gpt-4o-mini`; entitlement says Pro capability false | Implemented but currently not entitled/publicly promised | Deprecated from offer until decision |
| SEO Audit | `/api/seo-audit`, bounded fetch and PageSpeed integration | Implemented; public route exists | Free sample only after abuse review |
| SEO sites, reports, preferences, daily/weekly jobs | migrations, `/api/founder-signal/seo/*`, `vercel.json` crons | Implemented foundation; launch/notification delivery needs manual verification | Do not price as live recurring value |
| Email notifications | preference tables exist; no email provider/send implementation found | Incomplete | Not sellable |
| Marketing/blog/admin agents | OpenAI `gpt-4o-mini` admin routes | Internal/experimental | Exclude from customer entitlement |

**Important mismatch:** `lib/plans.ts` retains legacy “quick unlimited” fields and `FREE_ADVANCED_GENERATION_LIMIT`, while public product copy and the £7.99 plan present Bulk Check/Founder Signal. Treat these as technical debt, not a promise. Existing `paid`, `pro`, active/trialling, paid-through and `legacy_lifetime` profiles retain Pro entitlement by code.

## 4. AI and operating-cost inventory

| Feature/call site | Current provider/model | Trigger and maximum | Cost estimate/request (GBP) | Recommendation |
|---|---|---:|---:|---|
| Quick generation `lib/domainGen/quickGenerateGroq.ts` | Groq `openai/gpt-oss-120b` primary; Qwen 3.6 27B, GPT-OSS 20B, Vercel Gateway Gemini 2.5 Flash/OpenAI 4.1 mini recovery | 16 candidates plus editorial stage; retries possible | £0.001–£0.012 expected; high £0.05 with recovery | Keep 120B for paid quality; budget by attempts and token cap |
| Lab naming `lib/lab-name-generator.ts` | OpenAI `gpt-4.1-mini` default | 12 candidates | £0.001–£0.006 | Good structured fallback, require quality acceptance |
| Legacy generation `app/api/generate-domains` | OpenAI configurable `OPENAI_NAMING_MODEL`, default inferred 4.1 mini | 300/1,100 max output tokens per call | £0.001–£0.01 | Consolidate behind one quality router |
| Description analysis | OpenAI `gpt-4o-mini`, `max_tokens:500`; local fallback | one analysis | £0.0005–£0.003 | Move to GPT-4.1 mini/nano after quality test |
| Brand palette | OpenAI `gpt-4o-mini`, `max_tokens:1400` | one palette | £0.001–£0.006 | Paid credit, cache by input hash |
| Deep Search | OpenAI `gpt-4o`, `max_tokens:360`, up to five batches | five model calls plus domain checks | £0.02–£0.12 | Credit-only; replace with 4.1 mini quality test or limit to two batches |
| Admin marketing/blog agent | OpenAI `gpt-4o-mini` | admin-triggered | unknown; not customer COGS | set admin monthly budget |
| Founder Signal | local deterministic scorer | up to 50 names | £0.000–£0.003 compute/db | no model needed; retain server-only scoring |
| SEO audit/report engine | deterministic network/parser/PageSpeed; no customer-facing LLM call found | up to 1 MB fetched document, redirects bounded | £0.002–£0.03 expected | Meter sites/crawls, not report reads |

OpenAI official GPT-4.1 mini list price is $0.40/M input and $1.60/M output; GPT-4.1 nano is $0.10/$0.40. Groq lists GPT-OSS 120B at $0.15/M input, $0.60/M output; GPT-OSS 20B at $0.075/$0.30. Qwen 3.6 27B is listed by Groq at $0.60/$3.00. Token costs assume 1,500 input/500 output for a normal naming call and include no cached-input benefit. Model max output windows are vastly above application caps; cap API output explicitly.

### Infrastructure and third parties

| Service | Fixed or variable | Current evidence | Expected monthly cost | Notes |
|---|---|---|---:|---|
| Vercel Pro | Fixed | project uses Vercel queues, crons, functions | £15.80 ($20) | verify invoice/plan; Pro includes $20 usage credit |
| Supabase Pro | Fixed | production auth, Postgres, RLS, queue/workspace tables | £19.75 ($25) | first Micro compute covered in current plan |
| Stripe | Variable | Checkout, portal, webhook | £0.42 at £9.99 domestic card incl. 0.7% Billing estimate | payment fee 1.5% + 20p; Billing fee must be confirmed for actual contract |
| RDAP, DNS-over-HTTPS, IANA/Verisign | Variable but currently free/public | provider code | £0 direct, medium reliability risk | never claim contractual SLA; cache 15m and expose verification state |
| Google PageSpeed Insights | Variable/free quota | API key optional, SEO engine | £0 direct, quota/terms risk | key recommended for scheduled use; verify project quota |
| Vercel Blob | Variable | private video upload/download only | £0 under allowance; not core pricing COGS | avoid using for reports unless lifecycle set |
| Email | Unresolved | no delivery provider found | £0 currently | notifications are not actually deliverable evidence |
| Domains/SSL/Namecheap affiliate | Business/affiliate, not COGS | affiliate links only | unknown | domain registration not sold by NamoLux |

## 5. Feature and user cost model (low / expected / high, GBP)

| Unit | Low | Expected | High/failure case | Assumptions/confidence |
|---|---:|---:|---:|---|
| Quick Generate | £0.001 | £0.006 | £0.05 | 1–4 model attempts; medium |
| Advanced generation | £0.002 | £0.012 | £0.08 | 1,100 output cap/retries; low |
| Deep Search session | £0.02 | £0.06 | £0.15 | up to 5 `gpt-4o` batches; medium |
| AI Name Chat journey | £0.001 | £0.008 | £0.04 | deterministic names + 60 domain lookups; medium |
| Keyword refinement/description | £0.0005 | £0.002 | £0.006 | gpt-4o-mini fallback; high |
| Founder Signal 50 names | £0.0003 | £0.001 | £0.005 | server compute/db, no LLM; medium |
| one availability check | £0.00002 | £0.00008 | £0.0005 | cache reduces calls; low |
| bulk check: 10 names × 6 | £0.001 | £0.005 | £0.03 | queued/8-upstream bounded; low |
| bulk check: 50 names × 6 | £0.004 | £0.02 | £0.12 | 300 statuses; medium |
| brand palette | £0.001 | £0.003 | £0.01 | 1,400 output cap; medium |
| SEO audit/crawl | £0.002 | £0.012 | £0.08 | fetch + PageSpeed + snapshots; low |
| PageSpeed request | £0 | £0.001 | £0.01 | currently free API; quota risk; low |
| AI SEO summary | £0 | £0 | £0.02 | no customer LLM call verified; future estimate |
| one monitored site/week | £0.01 | £0.05 | £0.32 | four audits, snapshot storage; low |
| one monitored site/day | £0.06 | £0.32 | £2.40 | 30 audits; not safe for current Pro |
| notification email | £0 | £0 | £0.003 | no provider presently implemented |
| report storage/month | £0.0001 | £0.002 | £0.02 | Supabase rows, no attachments; low |
| active free account/month | £0.01 | £0.03 | £0.12 | recommended allowance |
| average paid/month | £0.07 | £0.16 | £0.65 | 4 bulk/4 score/one report |
| heavy paid/month | £0.55 | £1.35 | £3.50 | 20 bulk, 20 scores, 4 generator runs future |

## 6. Journey, segment and scenario modelling

Activation is the first completed multi-TLD Bulk Check; the strongest paid conversion moment is immediately after the result when the user wants a saved decision/export/report, not at anonymous landing. Naming is principally one-off. Weekly monitoring is the plausible recurring loop, but is not yet verified for sale.

| Journey/segment | Expected monthly cost | WTP and billing | Conversion trigger |
|---|---:|---|---|
| Casual visitor: one idea/check, leaves | £0.01–£0.04 | free acquisition | result usefulness |
| Active free founder | £0.03–£0.12 | £0; low recurring need | export, save, full batch |
| Average paid solo founder | £0.16–£0.52 incl. fixed allocation | £9.99/month or £19 one-time test | shortlist confidence/report |
| Heavy paid founder | £1.35 expected | Pro finite allowance; no unlimited | need to recheck/share |
| Agency/domain investor | £3.50+ and high support risk | future team/credits only | volume and portfolio workflow |
| Site owner with verified monitoring | £0.05 weekly/site | £9 add-on or £19.99 Launch | weekly alert/history |

**VAT and scenario formula:** a displayed £9.99 UK consumer price is assumed to include 20% VAT when VAT is chargeable, so accounting revenue before payment fees is £8.33. A domestic card plus assumed Stripe Billing fee is £0.42 on the gross checkout. This leaves £7.75 after £0.16 expected variable COGS. With £35.55 fixed cost, break-even payers = £35.55 / £7.75 = **4.6**, rounded to 5; at £60 fixed cost it is 7.7, rounded to 8. If NamoLux is not VAT-registered or has different tax treatment, rerun the calculator rather than using these figures.

| Displayed monthly price (VAT-inclusive) | revenue ex VAT after estimated payment/Billing | expected contribution after £0.16 COGS | gross margin before fixed allocation |
|---:|---:|---:|---:|
| £5.99 | £4.66 | £4.50 | 90% |
| £7.99 | £6.28 | £6.12 | 92% |
| £9.99 | £7.91 | £7.75 | 93% |
| £12.99 | £10.34 | £10.18 | 94% |
| £14.99 | £11.96 | £11.80 | 95% |
| £19.99 | £16.02 | £15.86 | 95% |
| £24.99 | £20.08 | £19.92 | 96% |

At 1,000 visitors and 3% paid conversion, 30 payers at £9.99 yield about £249.75 revenue excluding VAT; estimated payment/Billing fees are £12.59, expected variable COGS £4.80, fixed £35.55: contribution after fixed is about £196.81 (79% of revenue excluding VAT). At 1% conversion (10 payers), equivalent contribution after fixed is about £40.02 (48%). At 10,000 visitors, costs depend primarily on free usage: 300 active free users at £0.03 adds £9; 3% paid produces 300 payers and comfortably covers fixed costs. These are sensitivity examples, not observed conversion rates. At 100/1,000/10,000 registered free users, expected free subsidy is £3/£30/£300 per month; at 10/100/1,000 paid users, expected variable COGS is £1.60/£16/£160 before fixed allocation.

### Required traffic and activity sensitivity

This grid applies conversion to visitors solely to show the order of magnitude; actual funnel conversion must be measured by event. Payer contribution at the £9.99 displayed price is £7.75 expected, £7.84 low use, £6.56 heavy use and £4.41 extreme fair-use. Deduct £35.55 fixed cost and the appropriate free-user subsidy afterwards.

| Monthly visitors | 1% | 2% | 3% | 5% | 8% |
|---:|---:|---:|---:|---:|---:|
| 100 | 1 payer | 2 | 3 | 5 | 8 |
| 1,000 | 10 payers | 20 | 30 | 50 | 80 |
| 10,000 | 100 payers | 200 | 300 | 500 | 800 |

| Displayed price | Low-use margin | Expected-use margin | Heavy-use margin | Extreme fair-use margin |
|---:|---:|---:|---:|---:|
| £5.99 | 92% | 90% | 66% | 23% |
| £7.99 | 93% | 92% | 74% | 42% |
| £9.99 | 94% | 93% | 79% | 53% |
| £12.99 | 95% | 94% | 83% | 63% |
| £14.99 | 95% | 94% | 85% | 68% |
| £19.99 | 96% | 95% | 88% | 75% |
| £24.99 | 96% | 96% | 90% | 80% |

The extreme column assumes £3.50 variable monthly cost and shows why expensive AI must be finite even at £9.99. At 100/1,000/10,000 registered free users, expected subsidies are £3/£30/£300 respectively; 10/100/1,000 paying users create £77/£775/£7,745 expected monthly contribution before those free subsidies and fixed costs.

## 7. Freemium, plan design and alternatives

### Recommended entitlement table

| Feature | Free | Pro £9.99/mo or £99/yr | Internal fair use |
|---|---|---|---|
| Bulk Check | 1/month, 10 names | 20/month, 50 names | 4 starts/min/account; one active job |
| Founder Signal | 1/month, 10 names | 20/month, 50 names | 6 starts/min/account |
| Domain extensions | six | six | cache exact rechecks for 15 minutes |
| Save/compare | local draft | 10 projects, saved shortlists | read/export/delete after lapse |
| CSV/report/share | no | CSV + 10 reports/month + revocable shares | no raw provider payloads |
| Similar-name AI (future) | one sample of 8, signup required | 8 runs/month, 12 candidates/run | one quality router, 2 retries max |
| Deep Search (future) | no | 2 credits/month | non-rollover credits; buy £3 credit packs only after telemetry |
| SEO audit (future verified) | one one-page sample | 2/month | 1 MB/page, 5 redirects |
| Monitoring (future verified) | no | not included in current Pro | £9/site/week add-on; daily requires separate price |

Do not roll credits indefinitely; reset calendar-month allowances and give a transparent remaining meter. Do not grant free recurring monitors, unlimited Deep Search, unlimited generations, or 120 full 50-name bulk checks. Saved work should remain readable/exportable/deletable after cancellation; rechecks, scoring, saves and shares stop at period end. Cancelled monitoring pauses after the paid period; retain 30 days then delete according to published policy.

| Model | Assessment |
|---|---|
| A: one paid subscription | **Recommended now.** Simple, compatible with current Stripe/entitlements, but name choice is naturally episodic. |
| B: two paid subscriptions | Wait. A Launch/Monitor tier is valid only when monitoring and delivery are proven. |
| C: subscription + credits | Use only for Deep Search/quality generation; keeps expensive exceptions bounded. |
| D: one-time naming + recurring SEO | Strongest product-market fit once SEO is real; test £19 Decision Pack. |
| E: usage-based freemium | Useful internally as quotas; too confusing as the primary public story. |

## 8. Model routing and cost controls

| Feature | Current | Recommended free | Recommended paid/fallback | Quality/cost decision |
|---|---|---|---|---|
| Similar names / Quick | GPT-OSS 120B with routing | no full free generation or 1 sample | GPT-OSS 120B + structured editor; GPT-4.1 mini fallback | Preserve quality; £0.01 typical cost |
| Description | GPT-4o-mini | deterministic first | GPT-4.1 mini/nano A/B tested | cheaper structured extraction |
| Deep Search | GPT-4o | unavailable | GPT-4.1 mini trial; GPT-4o only if quality uplift measured | credits only |
| Palette | GPT-4o-mini | unavailable | GPT-4.1 mini after visual test | cache input/output |
| Founder Signal | deterministic | deterministic | deterministic | no LLM needed |
| SEO reports | deterministic | summary only | LLM summary only on changed audit | avoid token burn |

### Material risks

| Risk | Rating | Evidence | Control recommendation |
|---|---|---|---|
| Legacy generator routes retain broad Pro bypasses/legacy fields | High | `quickGenerationUnlimited`, legacy routes | finite plan quotas on every route before relaunch |
| Deep Search five expensive attempts | High | `MAX_BATCHES=5`, GPT-4o | auth + 2 monthly credits + per-run dollar ceiling |
| Public DNS/RDAP provider limits/ambiguous responses | High | free providers, queue retries | cache, provider SLA/paid source before scale, fail transparent |
| SEO daily cron/SSRF and PageSpeed scale | High | daily/weekly scheduled routes | allowlisted origin policy, max sites, per-site budget/lease |
| Notification feature has no sender | Medium | tables but no provider calls | do not market/email until delivery pipeline exists |
| Anonymous/free abuse | Medium | IP-derived identities and burst checks exist | WAF/bot challenge, signup for AI, anomaly alerts |
| Quota/idempotency failure | Low/Medium | DB counters fail closed, receipts/refunds | retain; monitor 503/refund rate |

## 9. Competitor research and positioning

| Competitor | Current public offer/pricing evidence | Relevance and NamoLux implication |
|---|---|---|
| [Namelix](https://namelix.com/) | free naming UI; custom LLM, filters and saved preferences; no subscription price displayed at research | direct free-acquisition rival; differentiate on evidence and decision record |
| [Brandmark](https://brandmark.io/pricing/) | $35/$95/$195 one-time logo packages | shows branding is often a one-time purchase |
| [Looka](https://looka.com/pricing/) | $20 basic logo, $65 premium; Brand Kit $96/year and Web $129/year in help pricing | subscription is justified by ongoing asset access, not the initial logo |
| [Atom](https://www.atom.com/how-it-works?amp=1&wvideo=l2bhtku7e6) | naming contests start at $299; domain marketplace/registrar | premium, high-touch/domain-marketplace alternative, not direct SaaS price anchor |
| [Semrush](https://www.semrush.com/kb/1547-seo-toolkit-pricing-limits) | SEO Toolkit $139.95/$249.95/$499.95 monthly; 5/15/40 monitored sites | validates monitoring as recurring but NamoLux must not claim comparable depth |
| [Namecheap Business Name Generator](https://www.namecheap.com/visual/business-name-generator/) | explicitly free and unlimited AI ideas; matching domains are sold separately | direct free naming/domain alternative; NamoLux must win on decision evidence, not free volume |
| [GoDaddy Business Name Generator](https://www.godaddy.com/de/business-name-generator) | explicitly free AI name/domain suggestions; monetises through domain/Airo ecosystem | direct free acquisition alternative; domain purchase is its conversion gate |
| [Shopify Business Name Generator](https://www.shopify.com/ca/tools/business-name-generator) | free, unlimited searches; leads into Shopify trial/domain purchase | direct free alternative; shows free naming is a mainstream acquisition tactic |
| [Durable](https://help.durable.co/es/articles/8583507-preguntas-mas-frecuentes) | Starter $12, Business $20, Mogul $80/month; paid site publishing and AI business tools | adjacent launch platform; its price is not a naming-only benchmark |
| [GoDaddy Airo](https://www.godaddy.com/en-uk/airo/ai-builder) | free 50 AI credits/month; UK Starter £7.49/month annual, Professional £17.99/month annual | adjacent build/launch benchmark with explicit credits |
| BrandCrowd, Wordoid and DomainWheel | BrandCrowd begins free but its locale/checkout price is dynamic; Wordoid/DomainWheel did not present a stable official paid naming price in this review | retain as monitored alternatives, not false precision in price comparison |

NamoLux should not compete on “more random names”. Position it as **the decision layer between a founder’s shortlist and a domain they can build on**. Meaningful, semantically anchored names are a quality promise that must be tested, not a license for an expensive model on every visitor.

## 10. 30-day validation plan and implementation implications

1. **Days 1–7:** add non-sensitive events: `bulk_started/completed`, candidate count, cache/provider status, `founder_signal_started/completed`, save/export/share, upgrade viewed/started/completed, AI attempts/tokens/model/cost, SEO audit/crawl/site count. Build a per-user contribution dashboard and alert at £2/month current COGS or 80% plan allowance.
2. **Days 8–21:** randomise new eligible visitors between £7.99 and £9.99; keep entitlement identical. Do not interpret a result until each arm has at least 100 activated users and 20 checkout starts; report Bayesian/interval uncertainty rather than winner-takes-all.
3. **Days 22–30:** test Free 1×10 versus 3×10 Bulk Check, and save/export gate versus report/share gate. Run a card-required seven-day trial only for a small, instrumented cohort.

Track visitor→generation, generation→signup, signup→activation, activation→checkout, free→paid, trial→paid, ARPPU, payment failures/refunds, churn, feature adoption, AI cost per active/payer, cost per name, audit/monitor retention, abuse rate and heavy-user margin. Keep £9.99 if activation is stable and payback/margin improve; lower only if conversion drops materially with confidence; raise/restructure if 90th-percentile payer COGS exceeds 25% of net revenue or scheduled monitoring is adopted without a separately funded add-on.

### Implementation implications (no code changed by this analysis)

The requested “find similar names” button is an attractive next experiment: place it next to the shortlist input, require a concise brief/preferences, return 12 candidates into the existing bulk box, then use the existing availability and Founder Signal workflow. It needs a separate implementation/quality gate: server-only model call, exact prompt/version telemetry, 12-candidate JSON schema, 2-attempt maximum, per-account monthly quota, no client-side score, and evaluation against a blinded naming benchmark before launch. It must not be advertised or included in the price until those conditions pass.

## 11. Assumptions and unresolved questions

1. Confirm actual Vercel/Supabase plans, invoices, usage credits, GBP tax registration and Stripe Billing fee.
2. Export 30/60/90-day anonymised route/model/DB/queue usage to replace all scenario assumptions.
3. Verify which generator flags are true in public and lab production, all current Stripe price IDs, and whether SEO notifications actually deliver.
4. Obtain contractual domain-availability provider costs/SLA before materially raising checks.
5. Run quality and cost benchmark before choosing a production model for similar-name generation.

## 12. Sources

- [OpenAI GPT-4.1 API announcement](https://openai.com/index/gpt-4-1/) — model pricing; accessed 2 August 2026.
- [Groq GPT-OSS 120B model page](https://console.groq.com/docs/model/openai/gpt-oss-120b) and [Groq models](https://console.groq.com/docs/models) — model prices and limits; accessed 2 August 2026.
- [Vercel pricing](https://vercel.com/pricing) and [Fluid Compute pricing](https://vercel.com/docs/functions/usage-and-pricing) — infrastructure list prices; accessed 2 August 2026.
- [Supabase pricing](https://supabase.com/pricing) — plan, storage and egress list prices; accessed 2 August 2026.
- [Stripe UK pricing](https://stripe.com/gb/pricing) — domestic card fee; accessed 2 August 2026. The separate Billing percentage is an estimate pending the account contract.
- [Google PageSpeed Insights API documentation](https://developers.google.com/speed/docs/insights/v5/get-started?hl=en) — API/key guidance; accessed 2 August 2026.
- [Namelix](https://namelix.com/), [Brandmark](https://brandmark.io/pricing/), [Looka](https://looka.com/pricing/), [Atom](https://www.atom.com/how-it-works?amp=1&wvideo=l2bhtku7e6), [Semrush](https://www.semrush.com/kb/1547-seo-toolkit-pricing-limits), [Namecheap](https://www.namecheap.com/visual/business-name-generator/), [GoDaddy Airo](https://www.godaddy.com/en-uk/airo/ai-builder), [Shopify](https://www.shopify.com/ca/tools/business-name-generator), and [Durable](https://help.durable.co/es/articles/8583507-preguntas-mas-frecuentes) — public competitor evidence; accessed 2 August 2026. Regional/currency presentation varies; do not rely on these sources as UK tax quotes.
