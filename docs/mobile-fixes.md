# Mobile Fix Handoffs — 2.9 → Agents (Phase 2 Wrap-up)

**Date:** 2026-04-17
**Source audit:** `docs/uxinfra-audit-2026-04-17/03-mobile-responsive.md`
**Branch:** `team2-2.9-qa`

## Legend
- ✅ = landed by 2.9 within own scope
- ⏳ = patch description ready, owner must apply
- 🟡 = partial (some work landed, some pending)
- ⏸ = deferred to Phase 4

## Summary table

| # | Fix | Status | Owner | Effort |
|---|---|---|---|---|
| R1 | Layer panel closed-by-default on mobile + bottom-sheet | ⏳ | 2.1 | 1–2 h |
| R2 | Hamburger button ≥44×44 px | ⏳ | 2.3 | 15 min |
| R3 | Bottom nav bar (5 slots) `<md` | ⏸ | 2.3 (Phase 4) | 4–6 h |
| R4a | `viewport-fit=cover` in `layout.tsx` | ⏳ | 2.3 | 5 min |
| R4b | Safe-area inset rules in `globals.css` | ⏳ | 2.3 | 30 min |
| R5a | Layer panel touch targets ≥44 px | ⏳ | 2.1 | 1–2 h |
| R5b | MapLibre native controls 44 px (CSS override) | ⏳ | 2.3 | 30 min |
| R6 | `LiveCounterStrip` scroll affordance (fade + hint) | ⏳ | 2.2 | 30 min |
| R7 | Min label size 11 px (no `text-[10px]`) | ⏳ | 2.1 + 2.2 + 2.3 | 30 min |
| R8 | Touch gestures (`touch-action: pan-y`) on horizontal rows | ⏳ | 2.2 | 1 h |
| R9 | Duplicate breadcrumb on `/trenes` | ⏳ | 2.2 | 15 min |
| R10 | `active:` variants alongside `hover:` (sweep) | ⏳ | global (Phase 4 codemod) | 2 h |
| R11 | `motion-reduce` global media query | ✅ | 2.9 (this branch) | — |
| R12 | `tests/visual/baseline.spec.ts` test timeout 60s | ✅ | 2.9 | — |

---

## R1 — Capas panel closed by default on mobile (2.1)

**File:** `src/components/map/TraficoMapControls.tsx`

**Current (circa line 31):**
```tsx
const [open, setOpen] = useState(true)
```

**Patch:**
```tsx
const [open, setOpen] = useState(() => {
  if (typeof window === 'undefined') return false  // SSR safe
  return window.innerWidth >= 768  // open on md+, closed on mobile
})
```

Optional upgrade: treat the panel as a bottom-sheet below `md` (anchored to `bottom-0`, full width, `rounded-t-2xl`, slide-up animation via Motion). That's the "correct" mobile pattern but adds effort; the `useState` default gate unblocks the launch.

---

## R2 — Hamburger touch target ≥44 px (2.3)

**File:** `src/components/layout/Header.tsx` (or the hamburger subcomponent it renders)

**Current:** `p-2` on `w-6 h-6` icon = ~40 px

**Patch:** Change `p-2` → `p-3` OR add `min-h-[44px] min-w-[44px] flex items-center justify-center` to the button.

---

## R3 — Bottom nav `<md` (DEFERRED Phase 4)

Design-level decision. 2.9 does not pre-empt. If 2.3 wants to ship this in Phase 3, route label for primary actions: `Mapa / Tráfico / Buscar / Marítimo / Menú`.

---

## R4a — `viewport-fit=cover` (2.3)

**File:** `src/app/layout.tsx`

**Current `Viewport` export:**
```tsx
export const viewport: Viewport = {
  themeColor: [...],
}
```

**Patch:**
```tsx
export const viewport: Viewport = {
  themeColor: [...],
  viewportFit: 'cover',  // enables env(safe-area-inset-*) on iOS
  width: 'device-width',
  initialScale: 1,
}
```

## R4b — Safe-area inset CSS (2.3)

**File:** `src/app/globals.css` (add alongside the motion-reduce block 2.9 just landed)

**Patch (append to globals.css):**
```css
/* iOS notch / home-bar safe areas (WCAG robust touch regions) */
@supports (padding: env(safe-area-inset-bottom)) {
  body {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .safe-top {
    padding-top: env(safe-area-inset-top);
  }
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .safe-left {
    padding-left: env(safe-area-inset-left);
  }
  .safe-right {
    padding-right: env(safe-area-inset-right);
  }
}
```

Then use `.safe-top` / `.safe-bottom` utility classes where fixed-position elements live (sticky header, future bottom nav, fullscreen map container).

---

## R5a — Layer panel touch targets (2.1)

**File:** `src/components/map/TraficoMapControls.tsx`

Wrap each checkbox label in a full-width `min-h-[44px] flex items-center` row. Replace `w-4 h-4` checkbox visual with `w-5 h-5` (20 px) — still small but paired with the 44 px row parent, the effective touch target is 44 px tall.

Group headers: add `min-h-[44px]` and use `py-3` instead of `py-2`.

## R5b — MapLibre controls override (2.3)

**File:** `src/app/globals.css` (append)

```css
/* MapLibre native control buttons — enforce 44×44 touch targets (WCAG 2.5.5) */
.maplibregl-ctrl button,
.maplibregl-ctrl-group button {
  width: 44px !important;
  height: 44px !important;
}
@media (min-width: 768px) {
  .maplibregl-ctrl button,
  .maplibregl-ctrl-group button {
    width: 36px !important;  /* restore compact on desktop */
    height: 36px !important;
  }
}
```

---

## R6 — LiveCounterStrip fade (2.2)

**File:** `src/components/home/LiveCounterStrip.tsx`

Add to the scrolling container:
```tsx
style={{
  scrollbarWidth: 'none',
  maskImage: 'linear-gradient(to right, transparent, black 4%, black 96%, transparent)',
  WebkitMaskImage: 'linear-gradient(to right, transparent, black 4%, black 96%, transparent)',
}}
```

---

## R7 — Min label size 11 px (multiple)

Find-and-replace:
- `text-[10px]` → `text-[11px]`
- `text-[0.65rem]` → `text-[0.7rem]`

Files observed in audit:
- `src/components/home/LiveCounterStrip.tsx`
- `src/components/map/TraficoMapControls.tsx` (owned by 2.1)
- `src/components/layout/nav/MobileMenu.tsx` (owned by 2.3)

---

## R8 — `touch-action: pan-y` on horizontal rows (2.2)

For horizontally scrollable card rows (`overflow-x-auto`), add `style={{ touchAction: 'pan-y' }}` so parent page scroll does not fight horizontal card scroll.

---

## R9 — Duplicate breadcrumb `/trenes` (2.2)

**File:** `src/app/trenes/page.tsx` lines 19–26

Remove the outer `<Breadcrumb>` block from `page.tsx` (the inner `TrainesContent` already renders one). Or vice versa — pick one location.

---

## R10 — `active:` sweep (deferred Phase 4)

Global codemod: wherever `hover:` appears on an interactive element, add `active:` with the same effect for touch press feedback. 2.9 will own this in Phase 4 because it is pure-additive.

---

## R11 — Motion-reduce global (✅ 2.9 landed)

See `src/app/globals.css` — `@media (prefers-reduced-motion: reduce)` block expanded to cover all `animate-*` / `transition-*` utilities + a `*`/`::before`/`::after` fallback capping duration at 0.01ms. WCAG 2.3.3 satisfied for users with motion sensitivity. No per-component edits needed.

## R12 — Test timeout bump (✅ 2.9 landed)

`tests/visual/baseline.spec.ts` now calls `test.setTimeout(60_000)` per test. Hub pages in dev mode exceed the default 30s during the post-networkidle 800ms buffer; 60s eliminates the false failures.
