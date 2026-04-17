# 09 — Design System Overhaul: Clean White Aesthetic

**trafico.live · SEO Audit 2026-04-17**

---

## 1. Current State Analysis

### Design Tokens in `globals.css`

**Root variables (12 defined)**

| Token | Value | Role |
|-------|-------|------|
| `--background` | `#ffffff` | Page background |
| `--foreground` | `#111827` | Body text |
| `--tl-primary` | `#1b4bd5` | Brand blue |
| `--tl-primary-hover` | `#092ea8` | Hover |
| `--tl-primary-bg` | `#f0f5ff` | Tinted surface |
| `--tl-primary-bg-hover` | `#dde8ff` | Tinted hover |
| `--tl-accent` | `#b56200` | Amber |
| `--tl-success/warning/danger/info` | – | Semantic signals |

**Tailwind `@theme inline` palette (40 color stops)**

- `tl-50` → `tl-950` (11 stops, blue)
- `tl-amber-50` → `tl-amber-950` (11 stops, amber)
- `tl-sea-50` → `tl-sea-950` (11 stops, ocean blue)
- Signal colors: `signal-green`, `signal-amber`, `signal-red`
- Transport mode colors: 7 tokens

**Typography tokens**

| Font | Variable | Weights |
|------|----------|---------|
| Exo 2 | `--font-heading` | 500–800 |
| DM Sans | `--font-body` | 400–600 |
| JetBrains Mono | `--font-mono` | 400–500 |

**Missing tokens**: No `ink-*` scale, no `surface-*` scale, no `shadow-*` scale, no `border-*` semantic scale, no spacing tokens beyond Tailwind defaults.

### Heavy Background Patterns Found

| Component | Classes | Problem |
|-----------|---------|---------|
| `Header` | `bg-gradient-to-r from-tl-900 via-tl-950 to-tl-900` | Full deep navy — heaviest element on every page |
| `Footer` | `dark bg-tl-950` (forced dark class) | Always-dark regardless of user theme preference |
| `DataStory` | `bg-gray-50 dark:bg-gray-900 border-t border-b` | Generic gray stripe, disconnected from brand tokens |
| `HeroMapUnified` loading | `bg-tl-50 dark:bg-gray-900` | Fine, but inconsistent with card surfaces elsewhere |
| `ProfessionalBanner` | `bg-tl-50` container | OK — this pattern should be the standard for section callouts |
| `LiveCounterStrip` | `bg-gradient-to-r from-white via-tl-50/30 to-white` | Actually aligned with target — keep |

### Layout Density

- Counter strip: tight at `py-2.5` — correct
- Section padding: `py-18` across home components — generous, keep
- Max-width: `max-w-7xl` throughout — consistent, keep
- Cards: no standardized card pattern; `ProfessionalBanner` feature cards use `bg-white border border-gray-200` which is the closest to the target

### Typography Scale in Use

- Eyebrow labels: `text-[0.6rem]` or `text-xs` uppercase tracking-widest
- H1: `text-2xl sm:text-3xl lg:text-4xl` (fluid via responsive)
- H2: `text-2xl` (DataStory, ProfessionalBanner)
- H3: `text-[11px]` uppercase in footer — very small
- Body: `text-sm` (13-14px) pervasive
- Data/numbers: `text-4xl font-data` (DataStory big numbers)
- No fluid utopia typography — hardcoded breakpoint steps

---

## 2. Target Aesthetic — "Clean White"

| Principle | Implementation |
|-----------|----------------|
| White canvas | `#ffffff` everywhere except subtle surface cards |
| Typographic hierarchy | H1 40-48px bold / H2 28-32px / H3 20-24px — drives structure without dark panels |
| Brand sparingly | `tl-600` for primary CTAs, active links, and live data dots only |
| Subtle depth | `shadow-sm` on cards (opacity 0.06), no hard-edge dark boxes |
| Generous air | `py-20` sections, `gap-6` grids, `px-6` card padding |
| Hairline dividers | 0.5–1px `ink-100/50` lines instead of stripe sections |
| Light-first | Dark mode is opt-in; header flips from navy → white on light |

---

## 3. Token Proposal

### Background Scale (add to `globals.css` `:root`)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-canvas` | `#ffffff` | Page base |
| `--bg-subtle` | `#f8fafc` | Alternate section tint |
| `--bg-muted` | `#f1f5f9` | Zebra row, input fills |
| `--bg-emphasis` | `#e2e8f0` | Hover on muted |
| `--bg-overlay` | `rgba(255,255,255,0.92)` | Frosted overlays (map chrome) |

Dark equivalents:
```css
.dark {
  --bg-canvas:    #0b0f1a;
  --bg-subtle:    #111827;
  --bg-muted:     #1a2232;
  --bg-emphasis:  #1e2d3d;
  --bg-overlay:   rgba(11,15,26,0.92);
}
```

### Surface Scale (cards)

| Token | Value | Usage |
|-------|-------|-------|
| `--surface-0` | `#ffffff` | Card background, elevated |
| `--surface-1` | `#f8fafc` | Nested card, section panel |
| `--surface-brand` | `#f0f5ff` | Brand-tinted callout (= existing `tl-primary-bg`) |

### Ink Scale (text — add, verify existing)

`--foreground` exists but is a single token. Expand:

| Token | Value | Usage |
|-------|-------|-------|
| `--ink-900` | `#111827` | Headlines, strong body |
| `--ink-700` | `#374151` | Body text |
| `--ink-500` | `#6b7280` | Secondary text, captions |
| `--ink-300` | `#d1d5db` | Disabled, placeholder |
| `--ink-200` | `#e5e7eb` | Hairline borders |
| `--ink-100` | `#f3f4f6` | Zebra fills, subtle dividers |

Add to `@theme inline` as `--color-ink-*` so Tailwind classes `text-ink-700`, `border-ink-200` work.

### Border Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--border-hairline` | `rgba(0,0,0,0.06)` | Subtle card edge |
| `--border-default` | `rgba(0,0,0,0.10)` | Standard card, input |
| `--border-strong` | `rgba(0,0,0,0.18)` | Focused input, active |
| `--border-brand` | `var(--color-tl-200)` | Brand-tinted card |

### Shadow Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)` | Chip, badge |
| `--shadow-sm` | `0 2px 6px rgba(0,0,0,0.06)` | Card default |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | Floating panel, dropdown |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.10)` | Modal, mega menu |

Map to Tailwind via `@theme inline`:
```css
--shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
--shadow-sm: 0 2px 6px rgba(0,0,0,0.06);
--shadow-md: 0 4px 16px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 32px rgba(0,0,0,0.10);
```

### Spacing Rhythm

Tailwind v4 uses 4px base. Preferred rhythm for sections:

| Usage | Class | px |
|-------|-------|----|
| Section vertical | `py-20` | 80px |
| Component inner | `py-12` | 48px |
| Card padding | `p-6` | 24px |
| Card padding compact | `p-4` | 16px |
| Grid gap | `gap-6` | 24px |
| Grid gap tight | `gap-4` | 16px |
| Inline/text gap | `gap-2` | 8px |

---

## 4. Component Patterns

### Card

```tsx
// Standard white card
<div className="bg-white border border-ink-100 rounded-xl p-6 shadow-sm">
  {children}
</div>

// Brand-tinted callout (replaces DataStory stripe)
<div className="bg-tl-50 border border-tl-100 rounded-xl p-6">
  {children}
</div>

// Compact stat card
<div className="bg-white border border-ink-100 rounded-lg p-4 shadow-xs">
  {children}
</div>
```

### Hero Section

```tsx
// Map pages: map is dark, chrome around it is white
<section className="bg-white">
  <div className="max-w-7xl mx-auto px-4 py-8">
    {/* Overlay card on map is already good — keep bg-white/90 blur */}
  </div>
</section>

// Content hero (no map)
<section className="bg-white pt-16 pb-12 border-b border-ink-100">
  <div className="max-w-3xl mx-auto px-4 text-center">
    <p className="text-xs font-semibold uppercase tracking-widest text-tl-600 mb-2">Eyebrow</p>
    <h1 className="font-heading text-4xl sm:text-5xl font-bold text-ink-900 tracking-tight">Title</h1>
    <p className="mt-4 text-lg text-ink-500 leading-relaxed">Subtitle</p>
  </div>
</section>
```

### Section Divider

```tsx
// Replace dark stripe sections (DataStory bg-gray-900) with:
<section className="py-20 px-4">           {/* white bg, whitespace divides */}
<section className="py-20 px-4 bg-subtle"> {/* alternating subtle tint */}

// Hairline between stacked sections (replace border-gray-800 dark stripes):
<hr className="border-0 border-t border-ink-100" />
```

### Data Table

```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="bg-ink-100 border-b border-ink-200">
      <th className="px-4 py-2.5 text-left font-semibold text-ink-700">Col</th>
    </tr>
  </thead>
  <tbody>
    {rows.map((row, i) => (
      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-ink-100/50"}>
        <td className="px-4 py-2 text-ink-700">...</td>
      </tr>
    ))}
  </tbody>
</table>
```

### CTAs

```tsx
// Primary
<button className="bg-tl-600 hover:bg-tl-700 text-white font-semibold text-sm rounded-lg px-5 py-2.5 transition-colors shadow-xs">
  Acción principal
</button>

// Secondary
<button className="bg-white border border-tl-200 hover:border-tl-400 text-tl-600 font-semibold text-sm rounded-lg px-5 py-2.5 transition-colors">
  Secundaria
</button>

// Ghost
<button className="text-tl-600 hover:underline font-medium text-sm underline-offset-2">
  Enlace ghost
</button>
```

### Badges / Chips

```tsx
// Status badge
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-tl-50 text-tl-700 border border-tl-100">
  Activo
</span>

// Data source badge (replace dark bg-tl-900 in footer)
<span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-ink-100 text-ink-500 border border-ink-200 tracking-wider">
  DGT NAP
</span>
```

---

## 5. Pages That Need Most Work

| Page / Component | Issue | Fix |
|-----------------|-------|-----|
| **Header** (`Header.tsx:15`) | `bg-gradient-to-r from-tl-900 via-tl-950 to-tl-900` — dark navy on light pages | Light: `bg-white border-b border-ink-100 shadow-xs`; force dark only in `.dark` |
| **Footer** (`Footer.tsx:38`) | `dark bg-tl-950` forced — always renders dark | Remove `dark` class; light version uses `bg-ink-100 border-t border-ink-200`; dark mode via `.dark` media |
| **Footer links** (`Footer.tsx:119`) | `text-gray-400 hover:text-white` — assumes dark bg | → `text-ink-500 hover:text-ink-900` |
| **Footer hub cards** (`Footer.tsx:84`) | `bg-white/[0.03]` — transparent hack for dark bg | → `bg-white border border-ink-100 shadow-xs hover:shadow-sm` |
| **Footer city pills** (`Footer.tsx:148`) | `bg-tl-900 border-tl-800 text-gray-400` | → `bg-ink-100 border-ink-200 text-ink-600 hover:border-tl-300 hover:text-tl-700` |
| **DataStory** (`DataStory.tsx:51`) | `bg-gray-50 dark:bg-gray-900 border-t border-b border-gray-200` | → `bg-white py-20` (whitespace divides) or `bg-subtle` alternating section |
| **Home** (`page.tsx:282`) | `bg-white dark:bg-gray-950` — fine, already white | No change needed |
| **Hubs** (maritimo, aviacion, etc.) | Inherit from above fixes | Pattern: white page, white cards, tl-50 callouts |
| **Entity pages** (province, city) | Likely uses generic Tailwind grays | Audit: swap `bg-gray-50` → `bg-subtle`, `border-gray-200` → `border-ink-100` |
| **Map pages** (mapa, trenes, estaciones-aforo) | Map itself stays dark (MapLibre dark theme) | Chrome around map (toolbars, sidebars, legend) → white `bg-white shadow-md` panels |

---

## 6. Dark Mode

Dark mode stays but becomes **opt-in, secondary**. Changes:

1. `<html>` default: no `dark` class — light is initial render
2. `ThemeToggle` stores preference in `localStorage`, applies `.dark` class to `<html>`
3. Remove `className="dark"` hardcoded in `Footer.tsx:38` — footer should follow theme
4. All dark variants remain in CSS; they activate when `.dark` class is present (already configured via `@variant dark (&:where(.dark, .dark *))`)
5. `layout.tsx` — remove any `dark` class injection from `<html>` tag; let ThemeToggle own it

Dark mode quality bar: dark surfaces use `bg-canvas` / `bg-subtle` token pairs defined above, not arbitrary `bg-gray-900` / `bg-tl-950`.

---

## 7. Concrete Change List

### `src/app/globals.css`

**Add to `:root`** (after signal colors block):

```css
/* Surface & background scale */
--bg-canvas:    #ffffff;
--bg-subtle:    #f8fafc;
--bg-muted:     #f1f5f9;
--bg-emphasis:  #e2e8f0;
--bg-overlay:   rgba(255,255,255,0.92);

/* Ink (text/border) scale */
--ink-900: #111827;
--ink-700: #374151;
--ink-500: #6b7280;
--ink-300: #d1d5db;
--ink-200: #e5e7eb;
--ink-100: #f3f4f6;
```

**Add to `.dark`**:

```css
--bg-canvas:    #0b0f1a;
--bg-subtle:    #111827;
--bg-muted:     #1a2232;
--bg-emphasis:  #1e2d3d;
--bg-overlay:   rgba(11,15,26,0.92);

--ink-900: #f1f5f9;
--ink-700: #cbd5e1;
--ink-500: #64748b;
--ink-300: #334155;
--ink-200: #1e293b;
--ink-100: #0f172a;
```

**Add to `@theme inline`**:

```css
/* Ink tokens → Tailwind utilities */
--color-ink-900: var(--ink-900);
--color-ink-700: var(--ink-700);
--color-ink-500: var(--ink-500);
--color-ink-300: var(--ink-300);
--color-ink-200: var(--ink-200);
--color-ink-100: var(--ink-100);

/* Background tokens */
--color-bg-canvas:  var(--bg-canvas);
--color-bg-subtle:  var(--bg-subtle);
--color-bg-muted:   var(--bg-muted);

/* Shadow scale */
--shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
--shadow-sm: 0 2px 6px rgba(0,0,0,0.06);
--shadow-md: 0 4px 16px rgba(0,0,0,0.08);
--shadow-lg: 0 8px 32px rgba(0,0,0,0.10);
```

### `src/components/layout/Header.tsx`

**Line 15** — Replace:
```
bg-gradient-to-r from-tl-900 via-tl-950 to-tl-900 border-b border-tl-700/30
```
With:
```
bg-white dark:bg-tl-950 border-b border-ink-200 dark:border-tl-800/50 shadow-xs
```

**Line 39** — Replace:
```
text-gray-400 hover:bg-tl-800/50 hover:text-gray-200
```
With:
```
text-ink-500 dark:text-gray-400 hover:bg-ink-100 dark:hover:bg-tl-800/50 hover:text-ink-900 dark:hover:text-gray-200
```

**Logo** (`Logo` component): ensure it accepts `theme="auto"` — dark logo on white header, light logo in dark mode.

### `src/components/layout/Footer.tsx`

**Line 38** — Replace:
```tsx
<footer className="dark bg-tl-950">
```
With:
```tsx
<footer className="bg-ink-100 dark:bg-tl-950 border-t border-ink-200 dark:border-tl-800/50">
```

**Line 83–84** (hub cards) — Replace:
```
border border-white/[0.06] ... bg-white/[0.03] hover:bg-white/[0.06]
```
With:
```
border border-ink-100 dark:border-white/[0.06] bg-white dark:bg-transparent hover:shadow-sm dark:hover:bg-white/[0.06]
```

**Lines 106, 135** (section heading text) — Replace `text-gray-300` → `text-ink-700 dark:text-gray-300`

**Lines 115–117** (link items) — Replace `text-gray-400 hover:text-white` → `text-ink-500 dark:text-gray-400 hover:text-ink-900 dark:hover:text-white`

**Lines 148–154** (city pills) — Replace `bg-tl-900 border-tl-800 text-gray-400 hover:border-tl-600 hover:text-tl-300` → `bg-white dark:bg-tl-900 border-ink-200 dark:border-tl-800 text-ink-600 dark:text-gray-400 hover:border-tl-400 dark:hover:border-tl-600 hover:text-tl-700 dark:hover:text-tl-300`

**Lines 62–69** (data source badges) — Replace `bg-tl-900 text-gray-500 border-tl-800` → `bg-white dark:bg-tl-900 text-ink-500 dark:text-gray-500 border-ink-200 dark:border-tl-800`

### `src/components/home/DataStory.tsx`

**Line 51** — Replace:
```
bg-gray-50 dark:bg-gray-900 border-t border-b border-gray-200 dark:border-gray-800
```
With:
```
bg-bg-subtle dark:bg-gray-900 border-t border-b border-ink-100 dark:border-gray-800
```

**Inline** `text-gray-700 dark:text-gray-300` → `text-ink-700 dark:text-gray-300`

### Other Tailwind Class Substitutions (global)

| Old class | New class | Where |
|-----------|-----------|-------|
| `bg-gray-50` | `bg-bg-subtle` | Section backgrounds |
| `bg-gray-900` | `dark:bg-bg-canvas` or remove | Dark-only strips |
| `border-gray-200` | `border-ink-200` | Card/table borders |
| `border-gray-800` | `dark:border-ink-200` | Dark borders |
| `text-gray-400` | `text-ink-500` | Secondary text (light) |
| `text-gray-300` | `dark:text-ink-700` | Secondary text (dark) |
| `text-gray-900` | `text-ink-900` | Headings/body |
| `hover:text-white` on footer | `hover:text-ink-900 dark:hover:text-white` | Footer links |

---

## 8. Accessibility Check

### WCAG AA Targets

| Pair | Ratio | Pass AA (4.5:1 text / 3:1 large) |
|------|-------|----------------------------------|
| `ink-900` (#111827) on `white` | 16.1:1 | Pass |
| `ink-700` (#374151) on `white` | 9.7:1 | Pass |
| `ink-500` (#6b7280) on `white` | 4.6:1 | Pass (marginal — use `font-medium` for small text) |
| `tl-600` (#1b4bd5) on `white` | 5.8:1 | Pass |
| `tl-600` (#1b4bd5) on `tl-50` (#f0f5ff) | 5.2:1 | Pass |
| White on `tl-600` (CTA button) | 5.8:1 | Pass |
| `ink-500` on `bg-subtle` (#f8fafc) | 4.4:1 | Borderline — only use for non-essential captions |

### Focus Ring on White Backgrounds

Current: Tailwind's default `focus:ring` may be invisible on white. Add to `globals.css`:

```css
:focus-visible {
  outline: 2px solid var(--color-tl-500);
  outline-offset: 2px;
  border-radius: 4px;
}
```

This ensures CTA buttons, nav links, and form inputs all have a visible `tl-500` ring on white backgrounds. Remove any `focus:outline-none` without a replacement ring.

---

## Summary

**18 tokens to add/modify** (6 background, 6 ink, 4 shadow, 2 existing token redefines). **7 components with direct class changes**: Header, Footer, DataStory, ProfessionalBanner (minor), HeroMapUnified (no change — map overlay already correct), LiveCounterStrip (already aligned), Logo (theme-auto prop). The biggest aesthetic shift is the **Header flip from full-width navy gradient to clean white with hairline border** — this single change makes every page feel lighter and removes the heaviest dark anchor on the site. Footer dark-mode hardcode removal is the second highest impact. Estimated implementation time: **3–4 hours** for tokens + Header + Footer + class sweep; **1 additional hour** for entity/hub page audit.
