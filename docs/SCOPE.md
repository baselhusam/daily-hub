# Scope

What DailyHub includes today and what is intentionally deferred.

## In scope (v1 — implemented)

### Entities & behavior

- [x] **Projects** — first-class; name, description, icon, optional logo, due date, status (`ACTIVE` | `PAUSED` | `DONE`)
- [x] **Tasks** — title, notes, due date, priority; link to project (or inbox with no project)
- [x] **Daily tasks** — habits with icons/logos and weekday schedules; toggle completes for **today**
- [x] **Completion log** — records task completions and daily toggles for analytics
- [x] **Settings** — display name, role, workspace label, streak visibility, nudge threshold

### UI

- [x] Today (`/`) with greeting, quick add, snapshot stats, today's habits, open work by project, inbox
- [x] Projects page (`/projects`) — CRUD with logo, due date, description, milestones
- [x] Habits page (`/daily`) — CRUD with logo and weekday scheduler
- [x] Analytics (`/analytics`) — overview cards, 14-day chart, project breakdown, daily habit rates (weekday-aware)
- [x] Left sidebar (desktop) or bottom tab bar (mobile) with project filter and quick stats
- [x] Command-center **notifications** in the top bar (overdue tasks, due today, remaining habits, stalled projects)
- [x] **Search palette** — jump to projects, tasks, habits, and milestones
- [x] Light / dark theme toggle

### Infrastructure

- [x] SQLite everywhere (`npx`, local dev, Docker)
- [x] Prisma migrations and seed data
- [x] Single-service `docker-compose.yml` (app on port 9999)
- [x] Next.js standalone Docker image with migrate-on-start
- [x] GitHub Actions CI (lint, typecheck, test, build)

## Out of scope (v1 — do not add without new agreement)

| Item | Notes |
|------|--------|
| Authentication / multi-user | Single-user self-hosted |
| FastAPI or separate API server | Server Actions only |
| Email/calendar integrations | — |
| Time-of-day scheduling for habits | Weekday picker only |
| Task assignments, comments, subtasks | Flat task list |
| Real-time sync / mobile native app | Web only |
| S3/cloud logo storage | Local `DAILYHUB_DATA_DIR/uploads/` |
| Push / email notifications | In-app bell only |
| Export / import | — |
| RBAC, teams, workspaces | — |

## Possible future scope (not committed)

- User accounts and hosted multi-tenant version
- Weekly/monthly recurrence patterns beyond weekday sets
- Drag-and-drop reorder for projects
- Calendar/board view for tasks
- Export completion history (CSV)
- Cloud logo storage
- PWA / offline support

## Non-goals

- Replace Jira, Linear, or Notion
- Heavy customization or plugin ecosystem
- Colorful/branded themes per project (neutral UI only in v1)
