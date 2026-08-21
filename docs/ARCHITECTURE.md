# Architecture

Technical design of DailyHub.

## High-level diagram

```mermaid
flowchart TB
  subgraph client [Browser]
    Today["Today /"]
    Projects["Projects /projects"]
    Daily["Habits /daily"]
    Analytics["Analytics /analytics"]
    Sidebar["App sidebar + search + notifications"]
  end

  subgraph nextjs [Next.js App Router]
    RSC["Server Components - data loaders"]
    Actions["Server Actions - mutations"]
    Client["Client Components - UI + Recharts"]
  end

  subgraph data [Data layer]
    Prisma["Prisma Client"]
    SQLite["SQLite data.db"]
  end

  Sidebar --> Today
  Sidebar --> Projects
  Sidebar --> Daily
  Sidebar --> Analytics
  Today --> RSC
  Projects --> RSC
  Daily --> RSC
  Analytics --> RSC
  Today --> Client
  Analytics --> Client
  Client --> Actions
  RSC --> Prisma
  Actions --> Prisma
  Prisma --> SQLite
```

## Request flow

### Read (Today)

1. `src/app/(app)/page.tsx` calls `getDashboardData()`
2. Parallel Prisma queries: projects+tasks, scheduled daily tasks, inbox, stats, notifications input
3. Data passed to client `DashboardShell` with URL-based project filter

### Read (projects / daily)

1. `/projects` calls `getProjectsPageData()` — all projects with open task counts
2. `/daily` calls `getDailyPageData()` — all daily tasks with weekday schedules

### Read (analytics)

1. `src/app/(app)/analytics/page.tsx` calls `getAnalyticsData()` in `src/lib/analytics.ts`
2. Aggregates completions, task counts, project stats, weekday-aware daily habit rates
3. Passed to `AnalyticsShell` with Recharts client components

### Write (mutations)

1. Client form/button invokes Server Action in `src/app/actions/`
2. Zod validation via `src/lib/validations.ts`
3. Prisma write (often `$transaction` for task complete + completion log)
4. `revalidatePath` for `/`, `/projects`, `/daily`, `/analytics`
5. Failures return `{ success: false, error }` via `failAction()` instead of throwing

## Route groups

```
src/app/
├── layout.tsx              # Instrument Sans / Doto / Geist Mono, ThemeProvider
├── not-found.tsx
├── global-error.tsx
├── uploads/[filename]/     # Serves DAILYHUB_DATA_DIR/uploads
└── (app)/
    ├── layout.tsx          # AppShell: sidebar, search, notifications
    ├── error.tsx
    ├── loading.tsx
    ├── page.tsx            # Today (/)
    ├── projects/page.tsx
    ├── daily/page.tsx
    └── analytics/page.tsx
```

`(app)` is a route group — URLs remain flat (`/`, `/projects`, etc.).

## Data model

```mermaid
erDiagram
  Project ||--o{ Task : has
  Project ||--o{ Milestone : has

  Project {
    string id PK
    string name
    string logoUrl
    date dueDate
    enum status
  }

  Task {
    string id PK
    string projectId FK
    string title
    date dueDate
    enum status
  }

  DailyTask {
    string id PK
    string title
    string logoUrl
    json weekdays
  }

  Settings {
    string id PK
    string displayName
    int nudgeDays
  }

  CompletionLog {
    string id PK
    enum entityType
    string entityId
    date completedOn
  }
```

### Completion semantics

| Action | Task row | CompletionLog |
|--------|----------|---------------|
| Complete ad-hoc/project task | `status = DONE`, `completedAt` set | New row `entityType=TASK` |
| Toggle daily task (on) | — | New row `entityType=DAILY_TASK`, `completedOn=today` |
| Toggle daily task (off) | — | Delete today's log for that daily task |

`CompletionLog` uses a unique constraint on `(entityType, entityId, completedOn)` for daily habits.

Daily tasks only appear on Today when `weekdays` includes today's JS `getDay()` value.

## Key libraries

| Library | Usage |
|---------|--------|
| `motion` | Page/card stagger, checklist animations |
| `recharts` | Analytics bar charts + compact Today chart |
| `date-fns` | Formatting, week boundaries, date ranges, overdue checks |
| `zod` | Server Action input validation |
| `lucide-react` | Icons via `iconKey` string lookup |

## File upload

- Server Action: `src/app/actions/upload.ts`
- Detection/sanitization: `src/lib/uploaded-image.ts` (magic-byte sniff; SVG allowlist sanitize)
- Writes to `DAILYHUB_DATA_DIR/uploads/` with UUID filename
- Max 2MB; PNG, JPG, WEBP, SVG (sanitized)
- Served via `src/app/uploads/[filename]/route.ts` at `/uploads/{uuid}.{ext}`
- SVG responses include `nosniff` and a sandboxed document CSP

Remote `https?://` logo URLs are stored on `Project.logoUrl` / `DailyTask.logoUrl` and rendered as `<img>` only.

## Docker services

| Service | Image / build | Port | Role |
|---------|---------------|------|------|
| `app` | `Dockerfile` (standalone Next) | 9999 | App + SQLite + auto migrate |

Volume: `dailyhub_data` → `/app/data` (`data.db` + `uploads/`).

## Security headers

`next.config.ts` sets CSP, `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` on all routes.

## Performance notes

- Today and analytics pages use `export const dynamic = 'force-dynamic'`
- Analytics queries are bounded (14-day window, 7-day daily stats)
- Prisma client singleton in `src/lib/prisma.ts` (dev hot-reload safe)
- SQLite runs with WAL mode, `busy_timeout`, and foreign keys enabled at startup
