# Scope

What DailyHub includes today and what is intentionally deferred.

## In scope (v1 — implemented)

### Entities & behavior

- [x] **Businesses** — name, Lucide `iconKey`, optional logo upload, sort order
- [x] **Projects** — under a business; name, description, icon, status (`ACTIVE` | `PAUSED` | `DONE`)
- [x] **Tasks** — title, notes, priority; link to business and/or project, or inbox (no project)
- [x] **Daily tasks** — recurring checklist items with icons; toggle completes for **today**
- [x] **Completion log** — records task completions and daily toggles for feed + analytics

### UI

- [x] Dashboard bento layout (businesses | projects | daily + inbox | completion feed)
- [x] Left sidebar with Dashboard + Analytics links and quick stats
- [x] Mobile top navigation
- [x] Light / dark theme toggle
- [x] Create dialogs for business, project, task, daily task
- [x] Analytics: overview cards, 14-day chart, business/project breakdown, daily habit bars

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
| Recurrence rules beyond daily habits | Daily tasks = every day |
| Task assignments, comments, subtasks | Flat task list |
| Real-time sync / mobile native app | Web only |
| S3/cloud logo storage | Local `public/uploads/` |
| Notifications / reminders | — |
| Export / import | — |
| RBAC, teams, workspaces | — |

## Possible future scope (not committed)

- User accounts and hosted multi-tenant version
- Weekly/monthly recurrence for habits
- Drag-and-drop reorder for businesses/projects
- Task due dates with calendar view
- Export completion history (CSV)
- Cloud logo storage
- PWA / offline support

## Non-goals

- Replace Jira, Linear, or Notion
- Heavy customization or plugin ecosystem
- Colorful/branded themes per business (neutral UI only in v1)
