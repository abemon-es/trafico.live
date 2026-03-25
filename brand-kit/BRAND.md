# trafico.live — Brand Guidelines

## Identity

**Name:** trafico.live
**Tagline:** Inteligencia vial en tiempo real
**Domain:** Real-time traffic intelligence for Spain
**Audience:** Personal travelers and professional transporters

## Voice

### Personality
Bold, data-confident, action-oriented. trafico.live speaks with authority because it has the data — official DGT sources updated every 60 seconds. No fluff, no filler. Direct answers for people who need to know NOW.

### Tone
- **Professional** but not corporate — accessible to both truckers and commuters
- **Direct** — lead with the data, not the explanation
- **Confident** — "X incidents on the AP-7" not "There may be some incidents"
- **Spanish-first** — natural Spanish, no forced anglicisms

### Writing rules
- Numbers always displayed, never written out ("3 incidencias" not "tres incidencias")
- Prices in monospace with 3 decimal places (1.234 EUR)
- Times in 24h format (14:30, not 2:30 PM)
- Always attribute data source ("Datos DGT", "Fuente: Ministerio")

## Visual Identity

### Color palette

**Primary — Signal Blue**
OKLCH-generated from `#1d4ed8`. A deep, authoritative blue inspired by highway signage.

| Step | Hex | Usage |
|------|-----|-------|
| 50 | `#f0f5ff` | Backgrounds, hover states |
| 100 | `#dde8ff` | Light backgrounds, selected states |
| 200 | `#c0d5ff` | Borders, dividers |
| 300 | `#94b6ff` | Muted text, disabled states |
| 400 | `#6393ff` | Links (dark mode), interactive |
| 500 | `#366cf8` | Primary buttons, active states |
| 600 | `#1b4bd5` | Brand primary, headers, CTAs |
| 700 | `#092ea8` | Hover states, emphasis |
| 800 | `#011577` | Dark accents |
| 900 | `#000245` | Dark surfaces |
| 950 | `#000025` | Deepest dark |

**Accent — Signal Amber**
OKLCH-generated from `#d97706`. Warm amber for alerts, warnings, fuel data, CTAs.

| Step | Hex | Usage |
|------|-----|-------|
| 50 | `#fff3ea` | Amber backgrounds |
| 100 | `#ffe2cc` | Amber light |
| 200 | `#fcc8a1` | Amber borders |
| 300 | `#eca66e` | Amber muted |
| 400 | `#d48139` | Amber interactive |
| 500 | `#b56200` | Amber primary |
| 600 | `#8c4a00` | Amber dark |
| 700 | `#653400` | Amber deep |

**Signal Colors (fixed, semantic)**
| Color | Hex | Meaning |
|-------|-----|---------|
| Green | `#059669` | Flowing traffic, success, available |
| Amber | `#d97706` | Warnings, works, moderate |
| Red | `#dc2626` | Incidents, blocked, danger |

### Typography

| Role | Font | Weights | Usage |
|------|------|---------|-------|
| Headings | **Space Grotesk** | 500, 600, 700 | h1-h6, navigation, CTAs |
| Body | **DM Sans** | 400, 500, 600 | Paragraphs, labels, UI text |
| Data | **JetBrains Mono** | 400, 500 | Prices, stats, coordinates, live data |

**Rules:**
- Headings always use Space Grotesk — never DM Sans for h1-h3
- Prices and numerical data always use JetBrains Mono with `tabular-nums`
- Body text minimum 16px, never below 14px for labels
- Use `.font-data` class for any numerical/statistical display

### Surfaces

| Mode | Background | Text | Cards |
|------|-----------|------|-------|
| Light | `#ffffff` | `#111827` | `bg-white border border-gray-200` |
| Dark | `#0b0f1a` | `#e2e8f0` | `bg-gray-900/50 border border-gray-800` |

Both modes fully supported. Dark mode uses elevated primary (tl-400) and softer amber (tl-amber-300).

### Animation

**Preset:** `decisive`

Motion for element-level interactions, GSAP ScrollTrigger for key scroll-pinned sections. Matches the "fast answers, confident data" personality.

- Element transitions: 150ms ease-in-out via Motion
- Scroll sections: GSAP pin + scrub for hero/stats
- No decorative animation — every motion has purpose
- `prefers-reduced-motion` always respected

### CSS Token Reference

```css
/* Semantic tokens (resolve differently in light/dark) */
var(--tl-primary)        /* Brand blue */
var(--tl-primary-hover)  /* Blue hover */
var(--tl-primary-bg)     /* Blue background */
var(--tl-accent)         /* Amber accent */
var(--tl-accent-hover)   /* Amber hover */

/* Tailwind classes */
bg-tl-600      /* Brand blue */
text-tl-50     /* Light text on blue */
bg-tl-amber-500 /* Amber accent */
text-signal-green /* Traffic flowing */
text-signal-red   /* Incident active */
```

### Anti-patterns (Never)
- Generic Tailwind blue (`blue-500`, `blue-600`) — always use `tl-*` scale
- Inter, Roboto, Arial, or system fonts in visible UI
- Emoji as icons — use Lucide React consistently
- Gradients as primary design element
- Low-contrast text (below WCAG AA)
- Animation without `prefers-reduced-motion` guard
- Hardcoded hex values in components — use CSS vars or Tailwind tokens

### Design rules for agents
- All frontend code must use `tl-*` and `tl-amber-*` color classes
- Headings must render in Space Grotesk (applied via CSS global rule)
- Data displays (prices, stats, counts) must use `.font-data` class
- Dark mode: use semantic vars (`var(--tl-primary)`) not fixed hex
- Cards: `rounded-lg shadow-sm border` — never `rounded-none` or heavy shadows
