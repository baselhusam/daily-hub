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
- Business `color` field exists for subtle border hints only

### Typography

- **Geist Sans** — UI and headings (`--font-geist-sans`)
- **Geist Mono** — available for monospace contexts
- Headings: `text-2xl font-semibold tracking-tight` for page titles
- Section labels: `text-sm font-medium`
- Body/meta: `text-sm` / `text-xs text-muted-foreground`

## Layout

### App shell

- **Desktop:** fixed left sidebar (~224px) — nav, project filter list, quick stats, theme toggle
- **Mobile:** sidebar hidden; top tab bar for Dashboard / Projects / Daily / Analytics
- Main content scrolls independently

### Dashboard (`/`)

Bento-style home:

| Section | Content |
|---------|---------|
| Stat row | Open tasks, overdue, daily today, completions this week |
| Chart | Compact 14-day activity chart |
| Filter chips | All, Inbox, per-project |
| Task tables | Simple columns: checkbox, title, due date — grouped by project + inbox |
| Side panel | Today's scheduled habits |

Empty states use muted `Card` with one-line guidance — never blank panels.

### Projects (`/projects`)

Card grid for defining projects: logo, name, description, due date, status, optional business label.

### Daily (`/daily`)

Card grid for habits: logo, title, weekday toggles (M–S), active flag, optional business.

### Analytics (`/analytics`)

- Top: page title + summary badges
- Row of 4 stat cards
- 2-column chart row (activity + business breakdown)
- 2-column tables/bars (projects + daily habits)

## Components

- **shadcn/ui** (new-york style) — Button, Card, Dialog, Checkbox, Badge, Input, ScrollArea, Table
- Composed patterns live in `src/components/dashboard/`, `src/components/projects/`, `src/components/daily/`, and `src/components/analytics/`
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
- Projects, daily tasks, and businesses can show custom logos via `EntityIcon`
- Optional **logo image** overrides icon when `logoUrl` is set

## Interaction patterns

| Pattern | Behavior |
|---------|----------|
| Complete task | Checkbox → Server Action → row disappears |
| Daily toggle | Checkbox → toggles today's completion log (only if scheduled today) |
| Create entities | Dialog forms on relevant pages |
| Project filter | Sidebar links or dashboard chips → `/?project=<id>` |
| Delete | Trash icon on tasks/projects/habits (destructive, no confirm in v1) |

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
