# Brand Launch Kit v2 — Product Plan

## Objective

Turn a chosen name into a useful, polished launch system without making every kit depend on expensive image generation. The paid feature should feel substantially more valuable than a palette and a basic page mockup while remaining predictable to operate.

## Product promise

**From chosen name to a coherent launch-ready identity system.**

Each kit should provide a strategic direction, reusable brand tokens, genuinely different templates, launch copy, responsive previews, and production-ready exports. Generated assets are starting points, not trade-mark clearance or a substitute for a professional designer.

## Experience

### 1. Brand brief

- Import the selected NamoLux name, domain, Founder Signal summary, audience, category, desired perception, and known constraints.
- Ask for the product promise, primary call to action, proof points, and launch channel.
- Let the user correct the brief before a kit allowance is consumed.

### 2. Three art directions

Create three meaningfully different directions, not colour swaps. Each direction contains:

- art-direction rationale and mood words;
- accessible five-colour palette with roles and contrast results;
- display and body typography pairings from open-source font families;
- spacing, radius, border, shadow, icon, and photography guidance;
- wordmark treatment, symbol direction, and do/don't rules;
- tone of voice, short positioning line, tagline options, and CTA copy.

### 3. Premium template families

Ship six deterministic template families at MVP, each with responsive desktop, tablet, and mobile layouts:

1. Editorial authority — high-trust services, consultancies, and premium products.
2. Product precision — SaaS, developer tools, and technical products.
3. Warm utility — consumer services, marketplaces, and local businesses.
4. Quiet luxury — hospitality, beauty, fashion, and premium lifestyle.
5. Bold launch — creator products, communities, and consumer apps.
6. Institutional trust — finance, health, property, and regulated sectors.

Layouts must differ in hierarchy, type scale, composition, navigation, proof treatment, imagery strategy, and motion—not just palette.

### 4. Asset suite

- responsive landing page with hero, proof, benefits, product or service section, FAQ, and final CTA;
- launch announcement and product-description copy;
- social avatar, cover image, Open Graph card, and three launch-post tiles;
- app or product card, browser/product screenshot frame, and presentation cover;
- business card and one-page brand sheet;
- wordmark, icon lockup, monochrome variants, favicon, and app-icon sizes;
- email signature and simple press-kit header.

### 5. Editing and comparison

- compare two directions side by side;
- switch templates without losing the brand brief or copy;
- edit copy, font pairing, palette roles, radius, density, and image treatment;
- save named versions and restore a previous version;
- flag contrast, overflow, missing CTA, and unsupported logo uses before export.

### 6. Exports

- HTML/CSS/JS landing-page bundle with semantic markup and responsive tokens;
- SVG where the asset is vector-safe; transparent PNG in standard sizes;
- social assets as PNG at platform-ready dimensions;
- brand tokens as CSS variables and JSON;
- concise PDF brand sheet in a later iteration once browser exports are stable.

## Cost architecture

- Use one small structured Luna call per new kit for strategy, messaging, and art-direction data.
- Render templates, mockups, layout variants, social sizes, and exports deterministically from saved design tokens.
- Do not call a model when the user changes template, palette role, copy, device, or export size.
- Make image-generated symbols optional and separately metered; default to typographic and deterministic geometric marks.
- Cache the structured kit payload and render previews client-side.
- Hard target: less than $0.02 AI cost for the standard kit, excluding an explicitly requested image-generation add-on.

## Data additions

- `brand_strategy_json`
- `typography_json`
- `design_tokens_json`
- `messaging_json`
- `template_family`
- `template_version`
- `asset_manifest_json`
- `current_version_id`
- version history table with user, timestamp, and changed fields

## Delivery sequence

### Phase 1 — Foundation

- Define the structured kit schema and six template contracts.
- Add deterministic brand tokens, font pairing, contrast validation, and seeded preview data.
- Replace generic sample metrics and copy with business-specific content from the brief.

### Phase 2 — High-value previews

- Build the six responsive landing-page templates.
- Add social, Open Graph, product-card, business-card, and brand-sheet renderers.
- Add direction comparison and lightweight editing.

### Phase 3 — Export quality

- Package semantic website files and JSON/CSS tokens.
- Add reliable PNG/SVG exports and standard asset dimensions.
- Test exported pages at 390, 768, 1024, and 1440 pixels.

### Phase 4 — Optional generative assets

- Add separately metered image-symbol generation only after the deterministic kit is strong.
- Add regeneration controls with a hard cost limit and safe fallbacks.

## MVP acceptance gates

- All six template families are visibly distinct in blind review.
- No placeholder company metrics, generic dashboard data, or irrelevant copy appears in a final kit.
- Every template passes mobile overflow, keyboard navigation, and WCAG AA contrast checks for normal text.
- A user can create, compare, edit, save, and export without another AI call after initial generation.
- Exported website files work without NamoLux runtime dependencies.
- Standard kit AI cost remains below $0.02 at P95.
- Failed initial generation refunds the kit allowance exactly once.
