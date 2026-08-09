# Design & UX

Visual and interaction direction for DailyHub.

## Design intent

DailyHub should feel **calm, minimal, and daily-use friendly** — something you open every morning without visual noise. It is not a marketing site or a dense enterprise dashboard.

**Keywords:** minimal, neutral, spacious, precise, subtle motion, trustworthy.

## Theme

### Color

- **Light:** white backgrounds, near-black text, soft gray borders (`oklch` neutrals in `src/app/globals.css`)
- **Dark:** deep gray backgrounds, off-white text, low-contrast borders
- **No accent color system** in v1 — charts and badges use foreground opacity steps
- Business `color` field exists for subtle border hints on business cards only

### Typography

- **Geist Sans** — UI and headings (`--font-geist-sans`)
- **Geist Mono** — available for monospace contexts
- Headings: `text-2xl font-semibold tracking-tight` for page titles
- Section labels: `text-sm font-medium`
- Body/meta: `text-sm` / `text-xs text-muted-foreground`

## Layout

### App shell

- **Desktop:** fixed left sidebar (~224px) — nav, quick stats, theme toggle
- **Mobile:** sidebar hidden; top tab bar for Dashboard / Analytics
- Main content scrolls independently

### Dashboard (`/`)

Bento-style grid on large screens:

| Column span | Section |
|-------------|---------|
| 3 | Business rail (selectable cards) |
| 5 | Projects + project tasks for selected business |
| 4 | Daily checklist + inbox |
| 12 | Recent completion feed |

Empty states use muted `Card` with one-line guidance — never blank panels.

### Analytics (`/analytics`)

- Top: page title + summary badges
- Row of 4 stat cards
- 2-column chart row (activity + business breakdown)
- 2-column tables/bars (projects + daily habits)

## Components

- **shadcn/ui** (new-york style) — Button, Card, Dialog, Checkbox, Badge, Input, ScrollArea
- Composed patterns live in `src/components/dashboard/` and `src/components/analytics/`
- Do not add new UI libraries without reason; extend shadcn primitives

## Motion

- **motion/react** for:
  - Header fade-in on page load
  - Staggered bento sections (`staggerChildren: 0.06`)
  - Checklist item layout transitions
  - Analytics stat card entrance
- Keep durations short (~0.35s); no looping animations

## Iconography

- Lucide icons referenced by string `iconKey` (see `src/lib/icons.ts` and `ICON_OPTIONS`)
- Daily tasks and businesses can show custom icons (e.g. `newspaper` for Medium)
- Optional **logo image** overrides icon on business cards via `EntityIcon`

## Interaction patterns

| Pattern | Behavior |
|---------|----------|
| Complete task | Ghost icon button with check → Server Action → row disappears |
| Daily toggle | Checkbox → toggles today's completion log |
| Create entities | Small outline `+` buttons open Dialog forms |
| Business select | Click business card → filters project panel (client state) |
| Delete | Trash icon on tasks/projects (destructive, no confirm in v1) |

## Accessibility

- Radix primitives provide focus rings and keyboard support
- Icon-only buttons include `aria-label`
- Theme respects `prefers-color-scheme` via `next-themes` with manual override

## What to avoid

- Purple gradients, glassmorphism, neon accents
- Multi-page wizards for simple creates
- Side drawers that hide the main dashboard
- Dense data tables without breathing room
- Heavy chart chrome — keep Recharts minimal (grid lines, simple tooltips)
