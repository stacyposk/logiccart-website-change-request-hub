---
id: design_system
version: 1.0
updated: 2025-09-10
brand: LogicCart
---

# Design System (MVP)

## 1. Heading Scale (Desktop)
- H1: 64/72, H2: 48/56, H3: 32/40, H4: 24/32 (Inter Semibold for H1–H3).  {#ds.type.scale.desktop}
- Mobile clamp: H1 40–52, H2 32–40, H3 24–28.  {#ds.type.scale.mobile}
- **Hero requires H2 or H1**; do not style body text as headings.  {#ds.type.hero_rule}

## 2. Buttons
- Variants: **Primary** (bg: `#5754FF`, text: `#FFFFFF`), **Secondary** (border: `#5754FF`, text: `#5754FF`).  {#ds.button.variants}
- Border radius **12 px**; min touch height **44 px**.  {#ds.button.shape}
- Hover: 6–8% darken; focus ring **2 px** with 4 px offset.  {#ds.button.states}
- **One primary CTA per view**.  {#ds.button.single_primary}

## 3. Spacing & Grid
- Spacing scale: 4, 8, 12, 16, 24, 32, 48.  {#ds.space.scale}
- Content max width **1200 px**; gutters **24 px**.  {#ds.grid.layout}

## 4. Links
- Inline links use **accent color** and underline on hover/focus.  {#ds.link.style}
- Do not use buttons for navigational inline links.  {#ds.link.no_button}

## 5. Cards & Media
- Card radius **16 px**, shadow subtle (no heavy drop shadows).  {#ds.card.style}
- Hero image aspect ratio **2.3–3.0** desktop, **1.6–2.2** mobile (aligns with Performance).  {#ds.media.hero_ratio}

## 6. States & A11y Bridge
- Focus visible on all interactive elements.  {#ds.a11y.focus}
- Color contrast **≥ 4.5:1** (text) / **3:1** (large text or icons).  {#ds.a11y.contrast}
