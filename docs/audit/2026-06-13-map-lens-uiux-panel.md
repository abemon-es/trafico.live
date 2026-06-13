# UX/UI Craft Panel — Map Lens Bar — 2026-06-13

Five UX/UI specialists (interaction/motion, IA/interaction-model, visual/brand,
mobile-ergonomics, content/UX-writing) reviewed the shipped lens bar against the
actual component code + rendered screenshots.

## Headline ratings
- Interaction/feel: sound but the instant layer swap reads as a bug; no press feedback.
- Interaction model: hierarchy is right, but single-select fights the most common task (combos).
- Visual: "fine, not yet premium" — passes AI-slop test; 85% glass bleeds the map.
- Mobile ergonomics: primary control sits in the hardest-to-reach zone (top).
- Content: three labels actively misdirect Spanish users.

## Folded in now (PR: feat/lens-uiux-polish) — unanimous, low-risk

**Copy (Content panel):**
- "Aire" → "Contaminación" (THE one content change — "Aire" reads as weather to a Spanish driver; misdirects a whole vertical)
- "Flujo" → "Sensores" (too abstract beside Incidencias/Cámaras/Radares)
- "Carga EV" → "Recarga" (EV is English jargon in Spain)
- "Meteo" → "Tiempo" (the word Spaniards actually use)
- toolbar aria-label "¿Qué quieres ver…?" → "Vistas del mapa" (APG: noun phrase, not a question read before every chip)

**Visual (Visual panel):**
- bg-white/85 → /92 (THE one visual change — stopped orange/red map markers bleeding through the bar)
- shadow-lg → shadow-xl + tinted shadow-tl-900/10 (lifts the bar off the near-white basemap)
- unified all 3 control panels to rounded-2xl + backdrop-blur-md (were a mismatched 2xl/xl, md/sm — "four glass blobs by different people" → one material)
- panel header font DM Sans → Exo 2 (UI chrome = Exo 2)
- hover:bg-slate-100 → hover:bg-ink-100 (brand neutral, not generic slate)

**Interaction/Mobile:** chip `active:scale-[0.94]` press feedback (motion-safe); min-w-[44px]; gap 1.5 → 2 (Apple HIG inter-target spacing).

**IA:** panel title reverted "Personalizar" → "Capas" (collided with the "Personalizado" custom-state marker; "Capas" is the honest, collision-free label). Legend now suppressed on single-layer/single-entry defaults (e.g. Radares) — the active chip already says what's shown.

## Three bigger calls — need your decision

### 1. Move the lens bar to the BOTTOM on mobile  (Mobile panel's #1)
The primary, most-tapped control sits at `top-3` — the hardest one-handed reach on a tall phone (Hoober N=1,333; every major map app migrated top→bottom 2018-23). For an in-transit app this is a genuine ergonomic miss. Counter: it reverses the placement we just shipped and requires re-choreographing the legend (bottom-left) + Rutas (bottom-right) so they don't collide. Effort M. **Recommendation: do it for mobile** (keep top on desktop where reach is moot) — it's the single biggest mobile usability gain.

### 2. Single-select "view" vs multi-select "filter"  (IA panel's #1)
Today a lens REPLACES the layer set (one active at a time). The IA reviewer's deepest critique: the most common real task is a COMBO ("live trains + stations"), which forces a trip to Capas. They argue chips should be additive toggles. Counter: additive toggles reintroduce the "build your own combo" cognitive load that lenses existed to escape; the calm-default + context-anchors we added already mitigate the sparse case. **Recommendation: a middle path** — keep single-select fast lenses, but add explicit compound lenses where a combo is the obvious need (e.g. a "Todo" chip per vertical), rather than making every chip a toggle. This keeps the one-tap simplicity AND serves the combo. Your call on philosophy.

### 3. Lens-switch crossfade  (Interaction panel's #1)
The layer swap is instant — old markers vanish, the map looks empty, new markers pop (200-800ms on cold tiles). Reads as a bug. Fix: 120ms fade-out → 150ms fade-in via MapLibre paint-opacity transitions (reduced-motion = instant cut). High feel-value but touches the delicate layer mount/unmount lifecycle, so it deserves its own careful, verified change rather than riding in a polish batch. **Recommendation: do it next, as a focused change** + pair it with the loading microcopy ("Cargando Sensores…", "Sin vuelos detectados ahora mismo") the Content panel proposed.

## Also noted (smaller, for the backlog)
- Right-edge scroll-fade mask so the 7 hidden lenses are discoverable (needs an inner-scroll-div restructure to mask content not the pill).
- Auto-scroll the active chip into view on mount.
- Safe-area insets (`env(safe-area-inset-*)`) — bar clips under Dynamic Island; legend/Rutas clip under the home indicator.
- Rutas FAB is a dark slate blob — should be `bg-tl-600` (primary CTA).
- Responsive chip height (desktop slimmer: py-2/38px, mobile py-2.5/44px).
- A "Restablecer" action on the Personalizado state (one tap back to default).
