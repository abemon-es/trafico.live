# a11y Report — 2.9 Phase 2 Progress

**Date:** 2026-04-17
**Source audit:** `docs/uxinfra-audit-2026-04-17/04-accessibility.md`
**Branch:** `team2-2.9-qa`

## Shared a11y primitives shipped (2.9-owned)

| File | Purpose |
|---|---|
| `src/lib/a11y/focus-trap.ts` | `useFocusTrap` hook with Tab cycling, Escape handling, return-focus |
| `src/lib/a11y/sr.ts` | `SR_ONLY_CLASS`, `FOCUSABLE_SR_ONLY_CLASS`, Spanish describe helpers (number/delay/price) |
| `src/lib/a11y/live-region.tsx` | `<LiveRegion>` component + `useAnnouncer` hook for `aria-live` |
| `src/components/a11y/FocusTrap.tsx` | Component wrapper around the hook (dialog/menu consumers) |

All imports via `@/lib/a11y/...` and `@/components/a11y/FocusTrap`.

## WCAG fix status

Legend: ✅ landed — ⏳ patch handed off to owner — ⏸ deferred (Phase 4) — 🟡 partially landed

| # | Fix | Status | Owner |
|---|---|---|---|
| 1 | Skip-to-content link | ✅ | 2.3 (`SkipLink.tsx`, mounted in `layout.tsx`) |
| 2 | `<main id="main-content">` landmark | 🟡 | Layout-level done by 2.3. Map-page local `<main>` still pending → 2.1/2.2 patch |
| 3 | Form label associations (calc + search) | 🟡 | /calculadora + /cuanto-cuesta-cargar ✅ (2.9, `e6ef7eaf` + `71f1b659`). Global search combobox ⏳ 2.3 |
| 4 | `gray-400` → `gray-600` light-mode text | ⏸ | Phase 4 codemod (4,082 instances) |
| 5 | ThemeToggle Spanish `aria-label` + `aria-pressed` | ✅ | Already correct (`ThemeToggle.tsx:36-37`) |
| 5b | Layer panel outer toggle `aria-expanded` + `aria-label` | ⏳ | 2.1 |
| 6 | `aria-current="page"` on active nav | ⏳ | 2.3 (Header/DesktopNav/MobileMenu) |
| 7 | Focus trap — CookieConsent | ⏳ | 2.8 — uses `<FocusTrap>` from 2.9 |
| 7b | Focus trap — CameraModal | ✅ | 2.9 (`CameraModal.tsx`, `afe53c48`) — consumes `<FocusTrap>` |
| 8 | `aria-live` on real-time updates | ⏳ | 2.1 (map), 2.2 (calculator results), 2.8 (consent save) — all consume `@/lib/a11y/live-region` |
| 9 | Layer panel group ARIA | ⏳ | 2.1 |
| 10 | Escape handler + focus trap — mobile menu | ⏳ | 2.3 — uses `useFocusTrap` from 2.9 |
| 11 | MapLibre `role="application"` + `aria-describedby` | ⏳ | 2.1 |
| 12 | `motion-reduce:animate-none` on skeletons | ⏳ | Global sweep — any agent, or 2.9 Phase 4 |
| 13 | Search combobox ARIA | ⏳ | 2.3 |
| 14 | MapLibre geolocation button `aria-label` | ⏳ | 2.1 |
| 15 | `aria-required` + visual asterisk on required fields | ⏳ | 2.2 |

## Summary for team lead

- **Phase 2 deliverables complete from 2.9 side.** All shared utilities are landed + documented. Handoff notes in `docs/a11y-fixes.md` with exact before/after snippets.
- **No 2.9 edits to other agents' files** — strict file-ownership respect. SendMessage to 2.1, 2.2, 2.3, 2.6, 2.8 with their per-file tasks.
- **Phase 4 (32 WCAG fixes) scoped to:** #4 (contrast codemod) + #12 (motion-reduce sweep) + baseline regeneration after other agents land their patches. The other 11 fixes are ⏳ waiting on owners.
- **Baselines:** 26 pre-refactor screenshots captured on `team2-2.9-qa` (commit `24247826`). Need regeneration once 2.3 chrome changes + any other owner fixes land.

## Next steps on 2.9's list

1. Regenerate baseline snapshots against post-chrome-merge layout.
2. Phase 4 — `motion-reduce:animate-none` sweep (global, touches many files — coordinate with team-lead on timing).
3. Phase 4 — `gray-400` → `gray-600` codemod.
4. 10 E2E test implementations (scaffolded as `test.fixme`; implement when respective dependencies land).
5. 18 mobile fixes (44px touch targets, iOS safe-area, layer panel collapse <md).

## Post-launch followups (S1 / S2)

Tracked per team-lead direction after Phase 2 ship-out:

| Flow | Scope | Sprint | Owner |
|---|---|---|---|
| 02 — Cmd+K global keydown | Wire global keydown once 2.3's combobox palette ships | S1 | 2.3 → request, 2.9 → test |
| 04 — /calculadora + /cuanto-cuesta-cargar E2E | 2.9 now owns this scope (granted by team-lead). Ship a11y ✅ + E2E test | S1 | 2.9 |
| 05 — /trenes live delay panel E2E | Post-launch per roadmap | S2 | 2.9 |

Flow 08 (`llms.txt`) is kept as a soft-check: Turbopack dev doesn't always pick up route handlers inside folders with `.` in the path — production build serves it correctly.
