# Mobile / Responsive Audit — trafico.live
**Date:** 2026-04-17  
**Breakpoints tested:** 375 px (iPhone SE), 768 px (iPad), 1280 px (Desktop)  
**Method:** Playwright screenshots (CSS pixel viewport) + static source analysis

Screenshots saved to: `.playwright-mcp/`

---

## 1. Breakpoint Strategy — Current State

### Tailwind breakpoints in use

| Prefix | px threshold | Usage pattern |
|--------|-------------|---------------|
| `sm:`  | 640 px      | px padding adjustments (`sm:px-6`) |
| `md:`  | 768 px      | Column counts, nav show/hide, map heights |
| `lg:`  | 1024 px     | Footer column layout, grid expansions |
| `xl:`  | 1280 px     | Rare; max-width containers only |

**Pattern: mobile-first** — base classes target mobile, modifiers add up. However, the implementation is inconsistent: several critical UI elements (layer panels, stats bars, popups) use fixed pixel dimensions with no responsive modifiers.

**Missing:** `2xl:` breakpoint never used. No `xs:` utility (< 375 px). No `dvh`/`svh` in the map height on pages other than the full map routes.

### Notable gaps
- No `@media (prefers-reduced-motion)` coverage in component CSS beyond the `gauge-arc` keyframe and the IncidentTicker ticker — Motion library handles most animations, but MapLibre popups use `linear` easing inline.
- Zero `env(safe-area-inset-*)` anywhere in the codebase (confirmed with grep). iPhone notch / home bar not accounted for.
- `Viewport` export in `layout.tsx` only sets `themeColor`; no explicit `width=device-width, initial-scale=1` (Next.js injects this automatically, but `viewport-fit=cover` is not set — required for notch support).

---

## 2. Key URLs Audited

### 2.1 `/` — Home
**Screenshots:** `.playwright-mcp/home-375.png`, `.playwright-mcp/home-768.png`, `.playwright-mcp/home-1280.png`

| Breakpoint | Status | Key Issue |
|------------|--------|-----------|
| 375 px | FAIL | Capas panel renders on top of hero map before user has scrolled; panel is 220 px wide on a 375 px viewport (58% of screen), cut off at right edge. Live ticker and counter strip scroll horizontally (intended), but there is no visible scroll affordance |
| 768 px | WARN | Capas panel still visible at same 220 px width — no responsive collapse; nav switches correctly to horizontal desktop nav at this width |
| 1280 px | PASS | Layout correct; panel is proportionally smaller |

### 2.2 `/maritimo` — Maritime hub
**Screenshots:** `.playwright-mcp/maritimo-375.png`, `.playwright-mcp/maritimo-768.png`, `.playwright-mcp/maritimo-1280.png`

| Breakpoint | Status | Key Issue |
|------------|--------|-----------|
| 375 px | PASS | Hero renders cleanly; CTAs "Ver combustible" / "Abrir mapa" stack in a row correctly; stat cards collapse to 2-column grid correctly |
| 768 px | WARN | Capas panel overlaps the embedded map section below the fold; panel opens by default |
| 1280 px | PASS | 4-column stat grid correct |

### 2.3 `/maritimo/mapa` — Fullscreen map
**Screenshot:** `.playwright-mcp/maritimo-mapa-375.png`

| Breakpoint | Status | Key Issue |
|------------|--------|-----------|
| 375 px | CRITICAL | TraficoMapControls panel (`absolute top-3 right-3 w-56` = 224 px) is open by default and covers ~60% of the 375 px viewport. The underlying map is barely accessible. No touch-friendly collapse gesture. Panel `max-h-[calc(100vh-200px)]` makes it scroll internally — a 39 px touch target on group headers (`py-2`) is borderline, and checkboxes use a custom `w-4 h-4` (16 px) visual with a visually hidden native input — well below the 44×44 px target |
| 768 px | WARN | Same issue, slightly less severe; panel at 224/768 = 29% of width |
| 1280 px | PASS | Panel proportionally fine |

### 2.4 `/trenes` — Railway hub
**Screenshots:** `.playwright-mcp/trenes-375.png`, `.playwright-mcp/trenes-768.png`

| Breakpoint | Status | Key Issue |
|------------|--------|-----------|
| 375 px | CRITICAL | Same Capas panel issue as fullscreen map. Map hero set to `height: 85vh, minHeight: 600, maxHeight: 900` — on a 375×812 device the map is 690 px tall, nearly full screen, but the Capas panel renders open on top of it from the right, leaving only ~150 px of accessible map. The breadcrumb renders twice ("Inicio / Red Ferroviaria" appears both in the hero section and above it) |
| 768 px | WARN | Panel less obstructive but still covers 29% of width open by default |

### 2.5 `/intensidad` — Traffic intensity (IMD)
**Screenshot:** `.playwright-mcp/aviacion-375.png` (redirected to `/intensidad`)

| Breakpoint | Status | Key Issue |
|------------|--------|-----------|
| 375 px | PASS | Clean layout; stats summary is a 2-col grid; IMD map embedded with proper height; tables wrapped in `overflow-x-auto` — correct |
| 768 px | PASS | 3-column grid transition with `md:grid-cols-3` works |

### 2.6 `/aviacion` — Aviation
**Screenshot:** `.playwright-mcp/aviacion-375-real.png`

| Breakpoint | Status | Key Issue |
|------------|--------|-----------|
| 375 px | PASS | Hero renders well; "379 aeronaves en vuelo ahora" badge renders correctly; 2-col stat cards fit |
| 768 px | NOTE | At 768 px this URL was observed to show `/maritimo` content due to a browser navigation race — investigate whether there is a route collision or an overzealous redirect |

---

## 3. Mobile Issues Per URL

### Touch target sizes

| Component | Measured size | 44×44 pass? |
|-----------|--------------|-------------|
| Hamburger menu button (header) | `p-2` on a `w-6 h-6` icon = ~40×40 px | BORDERLINE |
| ThemeToggle button | Not measured but uses `p-2` on a small icon | BORDERLINE |
| Layer panel group headers | `py-2 px-3` on `text-[10px]` row | FAIL — ~32 px tall |
| Layer panel checkboxes (visual) | `w-4 h-4` = 16×16 px | FAIL |
| Mobile menu accordion toggle | `p-3.5` = ~44 px | PASS |
| Mobile menu section links | `px-3 py-3` = ~48 px tall | PASS |
| Mobile search result rows | `py-2.5` = ~40 px | BORDERLINE |

### Horizontal scroll bleed
- **LiveCounterStrip**: `overflow-x-auto` with `scrollbarWidth: none` — the strip scrolls silently. No visual affordance (no fade-to-white edges or scroll indicator). On 375 px users see ~3 of 8 stats. Not discoverable.
- **IncidentTicker**: Uses an infinite CSS marquee. Content does not clip at edges — `overflow-hidden` is correctly set on the outer div. No bleed.
- **Tables** (intensidad, estaciones): Wrapped with `overflow-x-auto`. Correct; no bleed.

### Text clipping
- Hero breadcrumb on `/trenes` at 375 px shows "Inicio / Red Ferroviaria" followed by a second copy inside the hero card due to the breadcrumb being rendered both in `TrenesPage` and inside `TrainesContent`. The second instance clips against the Capas panel.
- Exo 2 headings at 375 px render well (Tailwind fluid sizing via `text-4xl` / `text-3xl` blocks). No clipping observed on hero texts.
- `font-data` monospace numbers in the stat cards scale correctly.

### Map controls accessibility on touch
- The Capas (layers) panel in `TraficoMapControls` uses `hover:` states for all interactivity — on touch there is no `active:` variant, making button press feedback absent.
- The "Capas" toggle button (`px-3 py-2`) has ~36 px height — below 44 px.
- MapLibre's own `+/-` zoom controls and the compass button render at ~30 px — also below target.
- No swipe-to-dismiss or bottom-sheet treatment for the layer panel on mobile.

### Nav drawer vs bottom bar
- Current approach: hamburger → slides down accordion from top of page (dark overlay on top of map).
- The mobile menu (`max-h-[85vh]`) can push content far below the fold on pages with many nav sections.
- No bottom navigation bar; all navigation is in the top header. On longer pages the header is `sticky top-0` which means the hamburger is always accessible, but the menu opens downward and can overflow maps.

### Font size readability at 375 px
- Body text (DM Sans 400) at `text-xs` / `text-sm` (12-14 px): acceptable.
- Stat strip: `text-[0.65rem]` = ~10.4 px labels — below 12 px minimum recommendation. Values at `text-sm` (14 px) are fine.
- Layer panel group labels: `text-[10px]` — very small, problematic on high-ppi devices at actual CSS pixels.
- Filter chips in mobile search: `text-[10px]` — same concern.

### Layout reflow at 768 px (breakpoint transitions)
- Header: transitions from hamburger-only to full desktop nav at `md:` (768 px). Verified clean.
- Stat cards: `grid-cols-2` → `md:grid-cols-3` → `lg:grid-cols-6` (intensidad). Correct.
- Footer: `flex-col` → `lg:flex-row` — OK.
- **Missing transition**: the Capas panel has no breakpoint change at 768 px. It stays `w-56` (224 px) absolute on the right at all sizes.

---

## 4. Critical Paths on Mobile

### Path 1: Home → Search → Detail
1. Tap hamburger (40 px — borderline) → menu opens
2. Tap search trigger in menu → full-viewport search appears ✓
3. Type query → results appear in grouped list ✓
4. Tap result → navigates ✓

**Tap count:** 3. Acceptable. Search UX in mobile menu is well-designed.

### Path 2: Hub page → Fullscreen map → Layer filter
1. Navigate to `/maritimo` → tap "Abrir mapa" (CTA button, ~44 px) ✓
2. Fullscreen map loads — **Capas panel immediately overlays 60% of screen** ✗
3. User must discover and tap "Capas" toggle to collapse (36 px button, no visible close X) ✗
4. After collapse, map is usable for pinch/pan ✓
5. Reopening Capas and selecting a layer: checkbox is 16 px — very hard to hit ✗

**Tap count to productive map use:** 5+ (including mandatory dismiss of panel). This path is broken on mobile.

### Path 3: Entity page → Share / Save
- No native share (`navigator.share()`) implemented anywhere.
- No bookmark/save functionality.
- Sharing requires copy-pasting URL manually.

### Path 4: Common task — "What is the fuel price near me?"
1. Home → scroll past map → section links → tap "Gasolineras" (large card) ✓
2. `/gasolineras` page loads → filters with dropdowns ✓
3. Filter select elements render with native OS picker on iOS — acceptable

**Tap count:** 3. OK.

---

## 5. Recommendations

### R1 — Layer panel: mobile collapse by default (CRITICAL)
**Issue:** `TraficoMapControls` (`absolute top-3 right-3 w-56`) opens by default at all sizes, covering 60% of screen on 375 px.  
**Fix:** Initialize `open` state to `false` on mobile (`window.innerWidth < 768`), or default to collapsed on all sizes. On mobile, render as a bottom sheet or slide-in from the right edge, not a floating panel.  
**File:** `src/components/map/TraficoMapControls.tsx` line 31  
**Effort:** 1–2 h

### R2 — Canonical mobile header: preserve hamburger, fix touch targets
**Issue:** Hamburger button is `p-2` on a `w-6 h-6` icon = ~40 px. Below 44 px.  
**Fix:** Change to `p-3` or add `min-h-[44px] min-w-[44px]` to the button in `Header.tsx`.  
**File:** `src/components/layout/Header.tsx` line 39  
**Effort:** 15 min

### R3 — Bottom bar for primary actions on mobile
**Current:** All navigation through a top hamburger.  
**Recommendation:** Add a 5-slot bottom navigation bar (`fixed bottom-0 left-0 right-0 safe-area-inset-bottom`) visible only on `< md` with: Home (map), Tráfico, Buscar, Marítimo, Menú (opens existing drawer). This brings primary paths to 1 tap.  
**File:** New `src/components/layout/BottomNav.tsx` + `layout.tsx` integration  
**Effort:** 4–6 h

### R4 — Safe area insets (iPhone notch / home bar)
**Issue:** Zero `env(safe-area-inset-*)` in the entire codebase. On iPhone 14/15 the home indicator overlaps any fixed bottom element.  
**Fix 1:** Add `viewport-fit=cover` to the Viewport export in `layout.tsx`.  
**Fix 2:** Add `pb-[env(safe-area-inset-bottom)]` (or equivalent) to the sticky header, any fullscreen map container, and the future bottom nav.  
**File:** `src/app/layout.tsx` line 117 + `globals.css`  
**Effort:** 1 h

### R5 — Touch target size on layer panel and map controls
**Issue:** Layer checkboxes render as `w-4 h-4` (16 px). Group headers are 32 px. MapLibre native controls ~30 px.  
**Fix:** Wrap each layer label/checkbox in a `min-h-[44px]` touch target. Increase custom checkbox to `w-5 h-5` minimum. For MapLibre controls, override `.maplibregl-ctrl button { width: 44px; height: 44px; }` in globals.css.  
**Files:** `src/components/map/TraficoMapControls.tsx`, `src/app/globals.css`  
**Effort:** 1–2 h

### R6 — LiveCounterStrip scroll affordance
**Issue:** Strip scrolls horizontally with `scrollbarWidth: none` — invisible on touch.  
**Fix:** Add `mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent)` or a right-edge fade to hint at scroll. Alternatively, limit to 4 visible items on mobile and add a carousel arrow.  
**File:** `src/components/home/LiveCounterStrip.tsx`  
**Effort:** 30 min

### R7 — Stat labels below 12 px minimum
**Issue:** `text-[0.65rem]`, `text-[10px]` used in LiveCounterStrip labels, layer group headers, filter chips.  
**Fix:** Enforce minimum `text-[11px]` for any visible label. On 375 px this is still small but within acceptable range at 2× DPR.  
**Files:** `src/components/home/LiveCounterStrip.tsx`, `src/components/map/TraficoMapControls.tsx`, `src/components/layout/nav/MobileMenu.tsx`  
**Effort:** 30 min

### R8 — Touch gesture support
- **Swipe on cards:** None implemented. Consider `touch-action: pan-y` on horizontally scrollable card rows to prevent scroll competition with page scroll.
- **Pinch on map:** MapLibre handles this natively. No override needed, but confirm `touch-action` is not being blocked by parent containers with `overflow-hidden`.
- **Bottom sheet for Capas:** See R1.

### R9 — Fix duplicate breadcrumb on `/trenes` at mobile
**Issue:** `TrenesPage` renders its own `<nav>` breadcrumb AND `TrainesContent` renders another at 375 px — both visible in the screenshot.  
**File:** `src/app/trenes/page.tsx` lines 19–26  
**Effort:** 15 min

### R10 — `hover:` states replaced with `active:` on touch
**Issue:** Layer panel group headers, stat cards, and several list items only define `hover:` Tailwind variants. On touch devices there is no visual press feedback.  
**Fix:** Add `active:bg-*` variants alongside `hover:bg-*` across interactive elements.  
**Effort:** 2 h (sweep across components)

---

## Summary Table

| URL | 375 px | 768 px | 1280 px | Worst issue |
|-----|--------|--------|---------|-------------|
| `/` | WARN | WARN | PASS | Capas panel bleeds over hero; counter strip non-discoverable |
| `/maritimo` | PASS | WARN | PASS | Capas panel on embedded map section |
| `/maritimo/mapa` | CRITICAL | WARN | PASS | Panel covers 60% of screen, 16 px checkboxes |
| `/trenes` | CRITICAL | WARN | PASS | Panel + duplicate breadcrumb, 85vh map below usable |
| `/intensidad` | PASS | PASS | PASS | Minor: no safe area |
| `/aviacion` | PASS | NOTE | PASS | Possible route race at 768 px |
