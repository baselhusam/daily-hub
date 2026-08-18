# Design & UX

Visual and interaction direction for DailyHub.

## Design intent

DailyHub is a **quiet workspace that keeps the day in one place** — paper, ink, one accent, and surfaces that organize today without shouting.

**Keywords:** quiet, paper, ink, one accent, typographic, dashboard surfaces.

Source of truth: `branding/DailyHub UI App.html`, `branding/DailyHub Design System.html`, and `branding/DailyHub Branding.html`.

## Theme

### Color

Paper, ink, and one accent — accent only for what is live (today, streaks, links, focus, primary CTAs).

| Token | Hex | Role |
|-------|-----|------|
| Ink | `#37352F` | Text, mark |
| Signal blue | `#2383E2` | Today, streaks, links, focus, primary buttons |
| Paper | `#F7F7F5` | Sidebar, wells, hover |
| Canvas | `#FFFFFF` | Cards, sheets, content |
| Canvas sunk | `#FBFBFA` | Group headers, row hover |
| Muted | `#787774` | Secondary copy |
| Faint | `#9B9A97` | Labels, counts |
| Rule | `#E9E9E7` | Dividers |
| Rule soft | `#F1F1EF` | Inner dividers |
| Done | `#0F9960` | Completed checkboxes only |
| Overdue | `#D44C47` | Late, destructive |
| Warn | `#D9730D` | Stalled, nudges |

- **Dark:** ink canvas, inverse mark, signal `#6BAEE9`
- Project `color` field exists for subtle entity tints only
- No gradients. Green means completed. Red means late. Orange means stalled.

### Typography

- **Instrument Sans** only — 400 / 500 / 600 (`--font-instrument-sans`)
- **Geist Mono** — available for monospace contexts
- Display: clamp(24–32px) / 600 / −1.5% tracking
- Page display (Projects, Habits, Analytics): clamp(30–42px)
- Section heading: 21px / 600 / −2.5%
- Body: 13.5–15px
- Eyebrow labels: 11.5px / 600 / +2% / faint
- Metrics: tabular-nums, 29px / 600
- Numerals: tabular, ink or signal — never a third color

## Layout

### App shell

- **Desktop (≥900px):** fixed left sidebar (256px, paper) — workspace lockup, main menu with counts, filter today, chain card, user chip
- **Top bar:** sticky glass bar — breadcrumb, search (⌘K), quick nav icons, user initial
- **Mobile:** lockup + streak pill in content; fixed bottom tab bar (Today / Projects / Habits / Analytics)
- Main column `max-w-[1080px]` with page gutters `clamp(14px, 2.6vw, 32px)`
- Selected nav is a white card with a 1px rule + raised shadow — hover is `#EFEFED`, never both
- Cards never nest

### Today (`/`)

| Section | Content |
|---------|---------|
| Header | Date eyebrow + greeting + subline; filter pill when filtered |
| Quick add | Inline task capture with project, due, Add |
| Nudges | Overdue and stalled project chips |
| Snapshot | Four metric cards with sparklines |
| Habits | Today's habits card with progress bar |
| Open work | Project groups with milestones, task rows |
| Inbox | Paper-surface card for ungrouped tasks |
| Week review | Ink panel linking to Analytics |

Project filters live in the **sidebar** only.

Empty states use the brand mark at 28% opacity and one plain sentence.

### Projects (`/projects`)

Project cards with progress bars, milestones, stalled banners.

### Habits (`/daily`)

Single surface list with day pills, 14-day consistency dots, and completion %.

### Analytics (`/analytics`)

Stat cards, CSS bar charts (activity, project hours, project progress, habit dots, weekdays, time of day).

## Components

- **shadcn/ui** (new-york style) — Button, Dialog, Checkbox, Badge, Input, ScrollArea
- Composed primitives in `src/components/ui/` and feature folders
- Primary CTAs use signal blue; ink for secondary emphasis
- Checkbox: rest `#C7C6C2`, hover ink, done green `#0F9960`, focus signal ring

## Motion

- Checking a box is instant — no animation longer than 160ms
- View switches: `dhFade` 300ms opacity
- Rows/cards entering: `dhIn` 220ms, 6px rise
- Dialogs: `dhPop` 200ms scale + fade
- Hover/press: color and border only, 120ms — never size

## Logo

An ink checkbox with the day marked (`src/components/brand-mark.tsx`).

- **Primary lockup:** mark + Daily**Hub** (Hub in signal)
- **Mark alone:** favicon, app icon
- **Ghost mark:** empty states, no day-dot, 28% opacity
- Clear space = ¼ mark; minimum 16px
- Do not gradient, shadow, stretch, or recolor the check

## Interaction patterns

| Pattern | Behavior |
|---------|----------|
| Complete task | Checkbox → Server Action → row shows done overlay for today |
| Habit toggle | Checkbox → toggles today's completion log |
| Quick add | Enter or Add → create task inline |
| Search | Top bar filter; ⌘K focuses search |
| Project filter | Sidebar links → `/?project=<id>` |
| Settings | Workspace chevron / user chip → settings dialog |

## What to avoid

- Purple gradients, neon accents
- Nested cards
- Accent fills larger than a button
- Blue filled checkboxes (use done green)
- Coaching copy or guilt about a broken chain
