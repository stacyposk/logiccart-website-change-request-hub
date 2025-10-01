---
id: performance
version: 1.0
updated: 2025-09-06
brand: LogicCart
---

# Performance Budget (MVP)

## 1. Hero images
- Max size: **500 KB**  {#perf.hero.size}
- Preferred formats: **AVIF/WebP**; JPG/PNG allowed if optimized  {#perf.hero.format}
- No inline base64 for hero assets  {#perf.hero.noinline}

### Dimensions
- Desktop width: **≥ 1440 px** (recommended **1920 px**)  {#perf.hero.width}
- Desktop height: **600–800 px** (recommended **800 px**)  {#perf.hero.height}
- Allowed aspect ratio (width÷height): **2.3–3.0**  {#perf.hero.ratio}

### Mobile Dimensions
- Mobile width: **≥ 750 px** (recommended **1080 px**)  {#perf.hero.mobile.width}
- Mobile height: **1000 px** (recommended **1350 px**)  {#perf.hero.mobile.height}
- Allowed aspect ratio (width÷height): **1.6–2.2**  {#perf.hero.mobile.ratio}

## 2. Other images
- Max size: **300 KB**  {#perf.other.size}
- Sprites/ICONS: use SVG where possible  {#perf.icons.svg}

## 3. Scripts
- **No new third-party JS** for v1  {#perf.script.nonew}
- First-party bundles must not increase LCP vs previous release  {#perf.script.lcp}

## 4. Fonts
- **No new webfont families** for v1  {#perf.font.nonew}
- Use existing allowlisted domains only (see `csp.json`)  {#perf.font.csp}

## 5. Animation & media
- No autoplay video on mobile  {#perf.media.mobile}
- Avoid layout-thrashing animations (transform/opacity only)  {#perf.anim.safe}

## 6. Lighthouse guardrails
- **No regression** vs baseline on LCP/CLS (75th percentile)  {#perf.lh.noregression}
- Images must have explicit width/height or aspect-ratio  {#perf.img.dimensions}