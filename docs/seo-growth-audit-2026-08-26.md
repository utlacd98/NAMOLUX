# NamoLux SEO growth audit — 26 August 2026

## Executive finding

The Search Console warning is not one problem. Most of the 105 `Crawled - currently not indexed` samples are stale versioned Next.js assets, old deployment query strings, or deliberately retired archive URLs. They do not justify mass publishing or blanket indexing.

The critical problem was introduced by the 25 August content cleanup: every industry landing page was changed to `noindex`, the startup-name collection disappeared from the sitemap, and the public Journal allowlist removed pages already earning clicks. This audit restores only proven pages and keeps unreviewed pages out of the index.

## Search Console baseline

Source: authenticated Search Console property for `https://www.namolux.com/`, inspected read-only.

- Report updated 21 August 2026: 112 indexed, 147 not indexed.
- Not indexed: 105 crawled/not indexed, 18 noindex, 11 404, 10 redirects, 1 alternate canonical, 1 duplicate canonical, 1 discovered/not indexed.
- Three-month performance (24 May–23 August): 174 clicks, 25,111 impressions, 0.7% CTR, average position 14.4.

## Severity classification

### Critical — fixed

- Proven industry winners (`fintech`, `saas`, `crypto`, `ai`, `travel`) were blanket-noindexed and omitted from the sitemap.
- Proven Journal winners (`wordoid-vs-namolux`, `panabee-vs-namolux`, `dot-com-vs-dot-ai-for-startups`, `domain-hacks-guide`, `namolux-vs-chatgpt-domain-name-generator`) became unroutable because static generation was restricted to a smaller allowlist.
- Four legacy generator articles redirected to `/blog/startup-name-ideas`, not the commercial `/startup-name-ideas` collection. This created the wrong destination and could create an avoidable chain.

### High value — fixed

- Industry and article conversion cards accepted a tailored brief but ignored it, sending every visitor to Bulk Check. They now open the generator with the page-specific brief and retain Bulk Check as a secondary action.
- Organic acquisition and the generator-to-revenue journey could not be measured consistently. Canonical privacy-safe events now cover landing, generator open/start/completion, domain check, Founder Signal, save, signup, trial, and paid invoice.
- The startup-name collection was excluded despite being the correct hub for the proven niche cluster. It is indexable and included in the sitemap.

### Medium — monitor and iterate

- Existing pages with strong impressions but weak CTR need title/description experiments, not replacement: GoDaddy comparison, best extensions, SEO-friendly startup names, Namelix alternatives, and the Journal hub.
- The remaining ten niche pages are useful to people but have no evidence-based reason to index yet. They remain accessible, followed, and `noindex` until reviewed.
- Stripe must be configured to send `invoice.paid` to the existing webhook endpoint before `purchase_completed` appears. Code support is present; no Stripe dashboard settings were changed during this audit.

### Low / no action

- Obsolete hashed JavaScript, CSS, font, favicon, and `?dpl=` URLs in the 404/crawled-not-indexed samples: no action. They are stale deployment artifacts and are not in the sitemap.
- Intentional permanent redirects for consolidated articles: no action beyond keeping them one hop.
- The single alternate-canonical and duplicate-canonical rows: monitor after recrawl; current canonical host, page canonicals, and apex-to-`www` redirect agree.
- Do not request validation for the old asset URLs and do not add them to robots rules. Google can naturally age them out.

## Existing winners to protect

| Page | Clicks | Impressions | CTR | Avg position |
| --- | ---: | ---: | ---: | ---: |
| Home | 40 | 570 | 7.0% | 6.2 |
| Bust a Name comparison | 29 | 614 | 4.7% | 6.7 |
| Namelix alternatives | 18 | 1,078 | 1.7% | 8.7 |
| Fintech name ideas | 18 | 331 | 5.4% | 8.1 |
| Wordoid comparison | 11 | 456 | 2.4% | 7.2 |
| SaaS name ideas | 7 | 383 | 1.8% | 9.5 |
| Two-word domain guide | 7 | 289 | 2.4% | 8.8 |
| Crypto name ideas | 4 | 95 | 4.2% | 6.9 |
| AI name ideas | 3 | 334 | 0.9% | 8.7 |
| Travel name ideas | 2 | 188 | 1.1% | 15.3 |

## Ranked opportunities (evidence, not invented search volume)

1. GoDaddy comparison: 3,729 impressions, 0.1% CTR, position 9.3 — highest title/snippet opportunity.
2. Best domain extensions: 2,606 impressions, 0.1% CTR, position 15 — improve intent match and internal generator path.
3. SEO-friendly startup name: 1,554 impressions, 0.2% CTR, position 22.4 — improve depth before chasing position.
4. Namelix alternatives: 1,078 impressions, position 8.7 — protect and test snippet language.
5. Fintech name ideas: proven 18-click industry winner — restore and route to a tailored generator brief.
6. SaaS name ideas: page-one visibility with weak CTR — restore and strengthen the generator journey.
7. AI name ideas: page-one visibility, weak CTR — restore and monitor.
8. Wordoid comparison: proven clicks at position 7.2 — restore and link across the competitor cluster.
9. Panabee comparison: position 7 with weak CTR — restore and review claims/snippet.
10. Startup-name collection: correct hub for industry intent and retired generator URLs.

## Funnel map

`organic search → seo_landing_view → contextual generator CTA → generator_opened → generator_started → generation_completed → domain_checked → founder_signal_viewed → result_saved → signup_started/completed → trial_started → purchase_completed`

Legacy events remain supported so the current dashboard does not lose historical continuity. Event metadata is allowlisted and excludes names, briefs, domains, email addresses, payment IDs, and user IDs.

## Internal link map

- Proven competitor articles → tailored generator brief + related public comparison pages.
- Proven industry pages → tailored industry generator brief → domain check → Founder Signal → saved result.
- `/startup-name-ideas` → all human-usable niche pages; only the five evidence-backed pages are indexable and in the sitemap.
- Retired generator articles → one-hop redirect to `/startup-name-ideas`.
- Journal and industry CTAs retain Bulk Check as the secondary route for visitors who already have names.

## Indexing policy after this change

- Index: home/core product pages, curated Journal, `/startup-name-ideas`, and the five proven industry pages.
- Noindex but accessible: ten unproven industry pages and short legacy guides awaiting editorial review.
- 404: obsolete build assets and truly retired unredirected URLs.
- Redirect: only when a retired URL has a clear equivalent destination.

## Next move

After deployment and recrawl, compare the five restored industry pages and restored competitor pages over 28 days. Run CTR experiments first on the GoDaddy comparison and best-domain-extensions page. Promote another niche from `noindex` only when it passes editorial review and shows real demand; do not expand the template set by default.
