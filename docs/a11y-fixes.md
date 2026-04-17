# a11y-fixes — cross-agent patch notes (2.9 → others)

**Source:** `docs/uxinfra-audit-2026-04-17/04-accessibility.md` (32 WCAG 2.1 AA violations).
**Author:** agent-2.9 (QA + a11y).
**Status of shared infra (owned by 2.9):** `src/lib/a11y/focus-trap.ts`, `src/lib/a11y/sr.ts`, `src/lib/a11y/live-region.tsx`, `src/components/a11y/FocusTrap.tsx` — all landed on `team2-2.9-qa`. Import via `@/lib/a11y/...` or `@/components/a11y/FocusTrap`.

Fixes in the following tables MUST be applied by the file owner. 2.9 will not edit these files — this document + a SendMessage is the handoff.

Already-landed fixes (no action): #1 SkipLink (2.3), #2 `<main id="main-content">` layout (2.3), part of #5 ThemeToggle Spanish label + `aria-pressed` (already correct in `ThemeToggle.tsx:36-37`), part of #10 mobile accordion `aria-expanded` (already correct in `MobileMenu.tsx:227`).

---

## For 2.3 — Header chrome + nav

**Owned files:** `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`, `src/components/layout/nav/*.tsx`, `src/components/layout/ThemeToggle.tsx`.

### Fix #6 — `aria-current="page"` on active nav links

`DesktopNav.tsx` and `MobileMenu.tsx` already compute `isActiveRoute(pathname, href)` for styling. Add the ARIA attribute on active `<Link>` elements.

```tsx
<Link
  href={item.href}
  aria-current={isActiveRoute(pathname, item.href) ? 'page' : undefined}
  ...
>
```

Apply to: hub links inside `AccordionSection` (`MobileMenu.tsx:288`), category item links inside `AccordionSection` (`MobileMenu.tsx:288`), any desktop nav item in `DesktopNav.tsx` that uses `isActiveRoute`.

### Fix #10 — Escape handler + focus trap for mobile menu

`MobileMenu.tsx` already has `aria-expanded` on each accordion toggle, but the outer menu has no Escape handling and no focus trap.

Add inside `export function MobileMenu()`:

```tsx
import { useFocusTrap } from '@/lib/a11y/focus-trap'
// ...
const { mobileMenuOpen, closeAll } = useNavState()
const containerRef = useFocusTrap<HTMLDivElement>({
  active: mobileMenuOpen,
  onEscape: closeAll,
  initialFocus: 'container',
  returnFocus: true,
})
// attach ref to the outer motion.div
<motion.div id="mobile-nav" ref={containerRef} role="dialog" aria-modal="true" aria-label="Menú principal" ... />
```

`useNavState` already exposes `closeAll` — confirm and wire.

### Fix #13 — Search combobox ARIA

Global search input (inside `MobileFullSearch` / desktop `MegaMenuPanel` search) is missing combobox ARIA. Add to the `<input>`:

```tsx
<input
  ref={inputRef}
  type="text"
  role="combobox"
  aria-label="Buscar ciudades, carreteras o gasolineras"
  aria-expanded={hasQuery && flatResults.length > 0}
  aria-controls="search-results-listbox"
  aria-autocomplete="list"
  aria-activedescendant={activeResultId /* new state to track */}
  ...
/>
```

And on the results container (`MobileMenu.tsx:112`-ish, and desktop equivalent):

```tsx
<div id="search-results-listbox" role="listbox" aria-label="Resultados de búsqueda">
  {items.map((result, i) => (
    <Link
      id={`search-result-${i}`}
      role="option"
      aria-selected={i === activeIndex}
      ...
    >
```

(2.9 offer: we can ship the `useActiveDescendant` helper to `src/lib/a11y/` if you'd rather not hand-roll it. Ping on completion.)

---

## For 2.1 — Map + layer panel

**Owned files:** `src/components/map/TraficoMap.tsx`, `src/components/map/InteractiveBaseMap.tsx`, `src/app/mapa/layer-panel.tsx`, `src/app/mapa/MapaClient.tsx`.

### Fix #2 (map pages) — `<main id="main-content">` wrapper

Wrap map-page root elements (`MapaClient.tsx`, `aviacion/page.tsx`, `maritimo/page.tsx` if map-centric) with `<main id="main-content" tabIndex={-1}>`. Root layout only places `<main>` around `children`, but some client-side top-level pages return a `<section>` — audit finding #2.

### Fix #9 — Layer panel ARIA

`src/app/mapa/layer-panel.tsx` outer toggle button needs:

```tsx
<button
  type="button"
  onClick={() => setOpen(!open)}
  aria-expanded={open}
  aria-controls="layer-panel-body"
  aria-label={open ? 'Cerrar panel de capas' : 'Abrir panel de capas'}
  ...
>
```

Group expand headers need `aria-expanded`, `aria-controls`, and the body `<div id="layer-group-<slug>">` needs `role="region" aria-labelledby="layer-group-<slug>-header"`.

Layer toggle buttons (`role="switch"`) need `aria-label={`Activar capa ${layer.name}`}` since the wrapping `<label>` is visual-only.

### Fix #11 — MapLibre container ARIA

In `InteractiveBaseMap.tsx` (the div containing `ref={mapRef}`):

```tsx
<div
  ref={mapRef}
  role="application"
  aria-label="Mapa interactivo de tráfico de España"
  aria-describedby="map-alt-description"
  ...
/>
{/* sibling, visually hidden */}
<p id="map-alt-description" className="sr-only">
  Mapa interactivo basado en canvas, no accesible con lector de pantalla.
  Consulta las listas equivalentes en <a href="/carreteras">carreteras</a>,
  <a href="/incidencias">incidencias</a> y <a href="/camaras">cámaras</a>.
</p>
```

### Fix #14 — Geolocation button aria-label

In `InteractiveBaseMap.tsx:651` (per audit) — replace `title="..."` with `aria-label="..."` on the MapLibre geolocation control. If MapLibre's built-in control lacks a label, add:

```tsx
mapRef.current?.on('load', () => {
  const geoBtn = mapContainer.current?.querySelector('.maplibregl-ctrl-geolocate')
  geoBtn?.setAttribute('aria-label', 'Mostrar mi ubicación')
})
```

### Fix #8 — `aria-live` for real-time map updates

Use `@/lib/a11y/live-region` to announce meaningful state changes (new incident cluster selected, train cluster clicked, layer toggled). Example:

```tsx
import { useAnnouncer } from '@/lib/a11y/live-region'

const [announcerNode, announce] = useAnnouncer()
// ...
onLayerToggle: (name, visible) => {
  setLayers(/* ... */)
  announce(`Capa ${name} ${visible ? 'activada' : 'desactivada'}`)
}
// render somewhere once:
{announcerNode}
```

---

## For 2.2 — Hubs + calculadora + forms

**Owned files:** hub pages + `/calculadora`, `/cuanto-cuesta-cargar`, form components.

### Fix #3 — Form label associations

For `calculadora/content.tsx` and `cuanto-cuesta-cargar/content.tsx`:

```tsx
// Before (labels not associated)
<div>
  <span className="text-sm font-medium">Origen</span>
  <input type="text" value={origin} onChange={...} />
</div>

// After
<div>
  <label htmlFor="calc-origin" className="text-sm font-medium">Origen</label>
  <input id="calc-origin" type="text" value={origin} onChange={...} />
</div>
```

Apply to every form field. If a visible label cannot be added, use `aria-label="..."` directly on the input.

### Fix #15 — Required field indicators

For any required calculator input:

```tsx
<label htmlFor="calc-origin">
  Origen <span aria-hidden="true" className="text-red-500">*</span>
</label>
<input id="calc-origin" aria-required="true" required ... />
```

Include a legend above the form: `<p className="text-xs text-gray-500"><span aria-hidden="true" className="text-red-500">*</span> Campos obligatorios</p>`.

### Fix #8 — `aria-live` for result panels

When calculator produces a result, announce it:

```tsx
import { LiveRegion } from '@/lib/a11y/live-region'
// ...
{result && <LiveRegion message={`Coste estimado: ${result.total} euros`} />}
```

---

## For 2.8 — Cookie consent + 404

**Owned files:** `src/components/legal/CookieConsent.tsx`, `src/app/not-found.tsx`, GDPR helpers.

### Fix #7 — Focus trap + full dialog ARIA

Wrap the banner body in `<FocusTrap>`:

```tsx
import { FocusTrap } from '@/components/a11y/FocusTrap'

return (
  <FocusTrap
    active={visible}
    role="dialog"
    ariaModal
    ariaLabel="Consentimiento de cookies"
    onEscape={() => { /* do NOT auto-dismiss — GDPR; just cycle focus */ }}
    initialFocus="first"
    className="fixed inset-x-0 bottom-0 z-[9999] ..."
  >
    <h2 id="cookie-title" className="...">Cookies</h2>
    <p id="cookie-desc">...</p>
    <button>Aceptar todas</button>
    <button>Rechazar</button>
    <button>Personalizar</button>
  </FocusTrap>
)
```

Note: per GDPR, Escape should NOT dismiss the dialog (that would be an implicit consent decision). Leave `onEscape` as a no-op or omit it.

### Fix #8 — `aria-live` on consent-state changes

When consent is saved, optionally announce `"Preferencias de cookies guardadas."` via `useAnnouncer`.

---

## For 2.6 — CameraModal + batch B entity pages

**Owned files:** `src/components/cameras/CameraModal.tsx`, batch B entity pages.

### Fix #7 — CameraModal full dialog ARIA + focus trap

`CameraModal` already handles Escape (audit §3). Add:

```tsx
import { FocusTrap } from '@/components/a11y/FocusTrap'

return (
  <FocusTrap
    active={open}
    role="dialog"
    ariaModal
    ariaLabel={`Cámara ${camera.name}`}
    onEscape={onClose}
    initialFocus="first"
    className="..."
  >
    {/* existing modal body */}
  </FocusTrap>
)
```

---

## Global (broad sweep — can be any agent or 2.9 follow-up)

### Fix #12 — `motion-reduce:animate-none` on all skeleton loaders

Grep target:

```
rg "animate-pulse|animate-ping|animate-bounce|animate-spin" src/ --files-with-matches
```

For each occurrence, add `motion-reduce:animate-none` to the `className` alongside the animation. Example:

```tsx
// Before
<div className="h-4 bg-gray-200 animate-pulse rounded" />
// After
<div className="h-4 bg-gray-200 animate-pulse motion-reduce:animate-none rounded" />
```

Scope: `HomeClient.tsx`, `MapaClient.tsx`, all `<LoadingState>` consumers, all Suspense fallbacks.

### Fix #4 — gray-400 → gray-600 secondary text (light mode)

4,082 instances — not a single-PR item. Recommend a codemod pass in a separate follow-up commit: `gray-400` → `gray-600` only for `text-*` classes in light-mode contexts (don't touch `dark:text-gray-400`).

Deferred to Phase 4 (WCAG fixes PR).

---

## Coordination

- When a fix lands, reply on the 2.9 SendMessage thread so I can regenerate the baseline screenshot for that component.
- If you need an a11y helper that doesn't exist yet in `src/lib/a11y/`, ping 2.9 and I'll add it — don't duplicate.
- The `<LiveRegion>` component wraps in an already-`sr-only` `<div role="status" aria-live="polite" aria-atomic="true">`, so you don't need to repeat those attributes on your own wrapper.
