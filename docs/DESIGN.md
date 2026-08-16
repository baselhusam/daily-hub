# Design & UX

Visual and interaction direction for DailyHub.

## Design intent

DailyHub should feel **quiet, readable, and daily-use friendly** — a morning list, not a dashboard of cards. Open it, see today, check things off, leave.

**Keywords:** quiet, paper, ink, one accent, typographic, low chrome.

Source of truth: `branding/DailyHub Branding.html` and `branding/DailyHub Design System.html`.

## Theme

### Color

Paper, ink, and one accent — accent only for what is live (today, streaks, links, focus).

| Token | Hex | Role |
|-------|-----|------|
| Ink | `#37352F` | Text, mark, primary buttons |
| Signal blue | `#2383E2` | Today, streaks, links, focus |
| Paper | `#F7F7F5` | Sidebar, wells, hover |
| Canvas | `#FFFFFF` | Cards, sheets, content |
| Muted | `#787774` | Secondary copy |
| Faint | `#9B9A97` | Labels, counts |
| Rule | `#E9E9E7` | Dividers |
| Done | `#0F9960` | Completed checkboxes only |
| Overdue | `#D44C47` | Late, destructive |

- **Dark:** ink canvas, inverse mark, signal `#6BAEE9`
- Business `color` field exists for subtle hints only
- No gradients. Green means completed. Red means late.

### Typography

- **Instrument Sans** only — 400 / 500 / 600 (`--font-instrument-sans`)
- **Geist Mono** — available for monospace contexts
- Display: 32px / 600 / −4% tracking
- Section heading: 21px / 600 / −2.5%
- Body: 13.5–15px
- Eyebrow labels: 11.5px / 600 / +4% / faint
- Numerals: tabular, ink or signal — never a third color

## Layout

### App shell

- **Desktop:** fixed left sidebar (216px, paper) — brand lockup, nav, project list, theme toggle
- **Mobile:** lockup + theme in a top bar; tabs for Today / Projects / Habits / Analytics
- Main column is narrow (`max-w-3xl`) so lists stay easy to scan
- Selected nav is a white card with a 1px rule — hover is paper, never both
- No duplicate stats in the sidebar; no floating card chrome

### Today (`/`)

A single readable column:

| Section | Content |
|---------|---------|
| Header | Greeting (or filtered project name) + date + Add task |
| Stats | Inline text: Open, Overdue, Habits, This week — not stat cards |
| Today | Habit checklist |
| Projects | Grouped task lists with a title row, not nested cards |
| Inbox | Ungrouped tasks |

Project filters live in the **sidebar** only. Activity charts live on Analytics.

Empty states use the brand mark at 28% opacity and one plain sentence — never blank panels or empty cards.

### Projects (`/projects`)

A list of workstreams: icon, name, description, then a meta line (open count, due date, status). Edit/delete appear on hover (always visible on mobile).

### Habits (`/daily`)

The same list pattern: icon, title, schedule in plain language (`Every day` or `Mon, Wed, Fri`).

### Analytics (`/analytics`)

- Title + one-line summary
- Four inline stats (not icon cards)
- Activity chart, business chart, project list, habit consistency — each with a section heading, no card wrappers

## Components

- **shadcn/ui** (new-york style) — Button, Dialog, Checkbox, Badge, Input, ScrollArea
- Cards exist as primitives but should be rare; prefer lists and section headings
- Composed patterns live in `src/components/dashboard/`, `src/components/projects/`, `src/components/daily/`, and `src/components/analytics/`
- Do not add new UI libraries without reason; extend shadcn primitives

## Motion

- Checking a box is instant — no animation longer than 160ms
- Dialogs: 200ms scale + fade
- Hover/press: color and border only, 120ms — never size
- No staggered page-load choreography

## Logo

An ink checkbox with the day marked (`src/components/brand-mark.tsx`).

- **Primary lockup:** mark + Daily**Hub** (Hub in signal)
- **Mark alone:** collapsed sidebar, favicon, app icon
- **Ghost mark:** empty states, no day-dot, 28% opacity
- Clear space = ¼ mark; minimum 16px
- Do not gradient, shadow, stretch, or recolor the check

## Iconography

- Lucide icons referenced by string `iconKey` (see `src/lib/icons.ts` and `ICON_OPTIONS`)
- Projects, habits, and businesses can show custom logos via `EntityIcon`
- Optional **logo image** overrides icon when `logoUrl` is set

## Interaction patterns

| Pattern | Behavior |
|---------|----------|
| Complete task | Checkbox → Server Action → row disappears |
| Habit toggle | Checkbox → toggles today's completion log (only if scheduled today) |
| Create entities | Dialog forms on relevant pages |
| Project filter | Sidebar links → `/?project=<id>` |
| Delete | Trash icon on hover (always visible on small screens); destructive, no confirm in v1 |
| Due dates | Relative when close (`Today`, `Tomorrow`, `Yesterday`), otherwise `EEE, MMM d` |

## Accessibility

- Radix primitives provide focus rings and keyboard support
- Icon-only buttons include `aria-label`
- Theme respects `prefers-color-scheme` via `next-themes` with manual override
- Hover-only actions remain available on touch (`opacity-100` below `md`)

## What to avoid

- Purple gradients, glassmorphism, neon accents
- Nested cards, bento grids, and chart chrome on the home page
- Accent fills larger than a button
- Duplicate filters (sidebar + chips)
- Multi-page wizards for simple creates
- Side drawers that hide the main view
- Dense data tables with header rows for short lists
- Unexplained controls (e.g. numeric priority fields)
- Coaching copy, exclamation marks, or guilt about a broken chain
