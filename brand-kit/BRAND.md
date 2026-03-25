# trafico.live — Brand Guidelines

## Identity

**Name:** trafico.live
**Tagline:** Inteligencia vial en tiempo real
**Domain:** Real-time traffic intelligence for Spain
**Audience:** Personal travelers and professional transporters

---

## Logo

### Icon — 3 Puntos
Three vertically stacked dots: red `#dc2626`, amber `#d97706`, green `#059669`.
No background, no housing — just the lights. Universal traffic signal.
Order is always: red (top), amber (middle), green (bottom). Never inverted.

**Icon geometry (at base 96px):**
- Dot diameter: 24px (d)
- Gap between dots: 12px (0.5d)
- Center-to-center: 36px
- Total height: 96px (3d + 2 gaps)
- All dots identical, perfectly centered on vertical axis

**Scaling:** At small sizes (≤20px), dots enlarge proportionally and gaps shrink. At 16px, dots nearly touch.

**App icon variant:** 3 dots (pastel: `#fca5a5`, `#fde68a`, `#6ee7b7`) on blue `#1b4bd5` rounded rect (r = 22% of size, padding = 8% of size).

### Wordmark
"trafico" in Exo 2 weight 800, letter-spacing -1.5px.
".LIVE" badge: blue `#1b4bd5` rounded rect (r=7px), contains white dot (r=4px, opacity 0.85) + ".LIVE" in Exo 2 700, 15px, letter-spacing 1.5px, white.

### Primary Lockup — Horizontal
Icon (3 dots) left, wordmark + badge right.

**Construction (at base size):**
- Icon total height: 96px (top of red dot to bottom of green dot)
- Gap icon→text: 24px (1d)
- "trafico" cap top aligns with red dot center line
- "trafico" baseline at vertical center of icon
- Badge sits 12px below baseline
- Badge bottom aligns approximately with bottom of green dot
- Clear space: 1d minimum on all sides

### Lockup Variants

| Variant | Use case | Description |
|---------|----------|-------------|
| **Horizontal** | Primary, default | Icon + wordmark + badge side by side |
| **Stacked** | Hero, splash, centered | Icon above, wordmark + badge below, centered |
| **Inline** | Nav headers, compact spaces | Small icon + "trafico" + small badge, single line |
| **Icon only** | Favicon, app icon, social avatar | 3 dots only |
| **Wordmark only** | When icon is already present nearby | "trafico" + .LIVE badge, no dots |

### Clear Space
Minimum clear space = 1d (one dot diameter) on all sides. No text, images, or UI elements within this zone.

### Minimum Sizes
- Inline lockup: 120px wide minimum
- Icon only: 16px tall minimum
- App icon: 32px minimum

### Do's & Don'ts

**Always:**
- Use correct signal colors: red top, amber middle, green bottom
- Include the white dot inside the .LIVE badge
- Maintain proportional spacing between dots

**Never:**
- Use a single color for all 3 dots
- Invert the color order
- Write ".live" as plain text without the badge
- Stretch, rotate, or distort the logo
- Add effects (shadows, glows, outlines) to the dots
- Place on busy backgrounds without sufficient contrast

---

## Voice

### Personality
Bold, data-confident, action-oriented. trafico.live speaks with authority because it has the data — official DGT sources updated every 60 seconds. No fluff, no filler. Direct answers for people who need to know NOW.

### Tone
- **Professional** but not corporate — accessible to both truckers and commuters
- **Direct** — lead with the data, not the explanation
- **Confident** — "47 incidencias en la AP-7" not "Puede haber algunas incidencias"
- **Spanish-first** — natural Spanish, no forced anglicisms

### Writing Rules
- Numbers always displayed, never written out ("3 incidencias" not "tres incidencias")
- Prices in monospace with 3 decimal places (1.234 EUR)
- Times in 24h format (14:30, not 2:30 PM)
- Always attribute data source ("Datos DGT", "Fuente: Ministerio")

---

## Color System

### Signal Blue — Primary
OKLCH-generated from `#1d4ed8`. WCAG AA+ validated.

| Step | Hex | Usage |
|------|-----|-------|
| 50 | `#f0f5ff` | Backgrounds, hover states |
| 100 | `#dde8ff` | Light backgrounds, selected states |
| 200 | `#c0d5ff` | Borders, dividers |
| 300 | `#94b6ff` | Muted text, disabled states |
| 400 | `#6393ff` | Links (dark mode), interactive elements |
| 500 | `#366cf8` | Primary buttons, active states |
| **600** | **`#1b4bd5`** | **Brand primary — headers, CTAs, badge** |
| 700 | `#092ea8` | Hover states, emphasis |
| 800 | `#011577` | Dark accents |
| 900 | `#000245` | Dark surfaces |
| 950 | `#000025` | Deepest dark |

### Signal Amber — Accent
OKLCH-generated from `#d97706`. WCAG AA+ validated.

| Step | Hex | Usage |
|------|-----|-------|
| 50 | `#fff3ea` | Amber backgrounds |
| 100 | `#ffe2cc` | Amber light states |
| 200 | `#fcc8a1` | Amber borders |
| 300 | `#eca66e` | Amber muted |
| 400 | `#d48139` | Amber interactive |
| **500** | **`#b56200`** | **Amber primary — warnings, fuel CTAs** |
| 600 | `#8c4a00` | Amber hover/dark |
| 700 | `#653400` | Amber deep |

### Signal Colors (Icon + Semantic)
These are the same colors used in the 3 Puntos icon. Fixed across light/dark modes.

| Color | Hex | Dark variant | Meaning |
|-------|-----|-------------|---------|
| Red | `#dc2626` | `#f87171` | Incidents, blocked, danger |
| Amber | `#d97706` | `#fbbf24` | Warnings, works, moderate |
| Green | `#059669` | `#34d399` | Flowing traffic, success |

### Semantic Tokens (CSS Variables)

```css
/* Resolve differently in light/dark mode */
var(--tl-primary)         /* #1b4bd5 light / #6393ff dark */
var(--tl-primary-hover)   /* #092ea8 light / #94b6ff dark */
var(--tl-primary-bg)      /* #f0f5ff light / rgba(27,75,213,0.15) dark */
var(--tl-accent)          /* #b56200 light / #d48139 dark */

/* Tailwind utility classes */
bg-tl-600                 /* Brand blue */
text-tl-50                /* Light text on blue */
bg-tl-amber-500           /* Amber accent */
text-signal-green          /* Traffic flowing */
text-signal-red            /* Incident active */
```

---

## Typography

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| Headings | **Exo 2** | 500, 600, 700, 800 | h1-h6, wordmark, navigation, CTAs, .LIVE badge |
| Body | **DM Sans** | 400, 500, 600 | Paragraphs, labels, descriptions, UI text |
| Data | **JetBrains Mono** | 400, 500 | Prices, statistics, coordinates, timestamps |

### Rules
- Headings always use Exo 2 (applied globally via CSS)
- Prices and numerical data always use JetBrains Mono with `font-variant-numeric: tabular-nums`
- Body text minimum 16px, never below 14px for labels
- Use `.font-data` CSS class for any numerical/statistical display
- The wordmark "trafico" is always lowercase

### Banned Fonts
Inter, Roboto, Arial, Geist, Space Grotesk, Helvetica, system-ui — never in visible UI.

---

## Surfaces

| Mode | Background | Text | Cards |
|------|-----------|------|-------|
| Light | `#ffffff` | `#111827` | `bg-white border border-gray-200 rounded-lg` |
| Dark | `#0b0f1a` | `#e2e8f0` | `bg-gray-900/50 border border-gray-800 rounded-lg` |

Both modes fully supported. Light mode is default.
Dark mode uses elevated primary (tl-400 `#6393ff`) and softer signal colors.

---

## Animation

**Preset:** `decisive`

- Element transitions: 150ms ease-in-out via Motion (`motion/react`)
- Scroll sections: GSAP ScrollTrigger pin + scrub for hero/stats
- No decorative animation — every motion has purpose
- `prefers-reduced-motion` always respected (disable all animation)
- GSAP/Lenis lazy-loaded via `next/dynamic`

---

## Icon System
Lucide React exclusively. No emoji as icons. Consistent stroke width (2px default) across all instances.

---

## Anti-patterns (Never)
- Generic Tailwind colors (`blue-500`, `indigo-600`) — always use `tl-*` scale
- Hardcoded hex values in JSX components — use CSS vars or Tailwind tokens
- Inter, Roboto, Arial, Geist fonts in visible UI
- Emoji as UI icons
- Gradients as primary design element
- Low-contrast text (below WCAG AA 4.5:1)
- Animation without `prefers-reduced-motion` guard
- Writing ".live" as plain text (always use the badge component)

---

## Agent Rules
When building or modifying frontend code for trafico.live:
- All color references must use `tl-*` and `tl-amber-*` Tailwind classes
- Headings render in Exo 2 (applied via global CSS rule on h1-h6)
- Data displays (prices, stats, counts) must use `.font-data` class
- Dark mode: use semantic CSS vars (`var(--tl-primary)`) not fixed hex values
- Cards: `rounded-lg shadow-sm border` — never `rounded-none` or heavy shadows
- Icon in header: use the inline lockup (3 dots + "trafico" + .LIVE badge)
- Signal colors in the icon are ALWAYS red/amber/green, top to bottom
