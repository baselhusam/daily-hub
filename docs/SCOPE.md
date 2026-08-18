# Scope

What DailyHub includes today and what is intentionally deferred.

## In scope (v1 — implemented)

### Entities & behavior

- [x] **Projects** — first-class; name, description, icon, optional logo, due date, status (`ACTIVE` | `PAUSED` | `DONE`)
- [x] **Tasks** — title, notes, due date, priority; link to project (or inbox with no project)
- [x] **Daily tasks** — habits with icons/logos and weekday schedules; toggle completes for **today**
- [x] **Completion log** — records task completions and daily toggles for analytics

### UI

- [x] Dashboard with bento stats, compact activity chart, project filter, simple task tables (title + due date), today's scheduled habits
- [x] Projects page (`/projects`) — CRUD with logo, due date, description
- [x] Daily page (`/daily`) — CRUD with logo and weekday scheduler
- [x] Left sidebar with Dashboard, Projects, Daily, Analytics, project filter list, and quick stats
- [x] Mobile top navigation
- [x] Light / dark theme toggle
- [x] Analytics: overview cards, 14-day chart, project breakdown, daily habit rates (weekday-aware)

### Infrastructure

- [x] PostgreSQL in Docker
- [x] Prisma migrations and seed data
- [x] Full-stack `docker-compose.yml` (db + app on port 9999)
- [x] Next.js standalone Docker image with migrate-on-start

## Out of scope (v1 — do not add without new agreement)

| Item | Notes |
|------|--------|
| Authentication / multi-user | Single-user self-hosted |
| FastAPI or separate API server | Server Actions only |
| Email/calendar integrations | — |
| Time-of-day scheduling for habits | Weekday picker only |
| Task assignments, comments, subtasks | Flat task list |
| Real-time sync / mobile native app | Web only |
| S3/cloud logo storage | Local `public/uploads/` |
| Notifications / reminders | — |
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
