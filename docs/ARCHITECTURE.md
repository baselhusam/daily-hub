# Architecture

Technical design of DailyHub.

## High-level diagram

```mermaid
flowchart TB
  subgraph client [Browser]
    Dashboard["Dashboard /"]
    Analytics["Analytics /analytics"]
    Sidebar["App sidebar"]
  end

  subgraph nextjs [Next.js App Router]
    RSC["Server Components - data loaders"]
    Actions["Server Actions - mutations"]
    Client["Client Components - UI + Recharts"]
  end

  subgraph data [Data layer]
    Prisma["Prisma Client"]
    PG["PostgreSQL 16"]
  end

  Sidebar --> Dashboard
  Sidebar --> Analytics
  Dashboard --> RSC
  Analytics --> RSC
  Dashboard --> Client
  Analytics --> Client
  Client --> Actions
  RSC --> Prisma
  Actions --> Prisma
  Prisma --> PG
```

## Request flow

### Read (dashboard)

1. `src/app/(app)/page.tsx` calls `getDashboardData()` in `src/lib/dashboard.ts`
2. Parallel Prisma queries: businesses+projects+tasks, daily tasks, inbox, completions
3. Data passed to client `DashboardShell` for filtering and interactions

### Read (analytics)

1. `src/app/(app)/analytics/page.tsx` calls `getAnalyticsData()` in `src/lib/analytics.ts`
2. Aggregates completions, task counts, business/project stats, daily habit rates
3. Passed to `AnalyticsShell` with Recharts client components

### Write (mutations)

1. Client form/button invokes Server Action in `src/app/actions/`
2. Zod validation via `src/lib/validations.ts`
3. Prisma write (often `$transaction` for task complete + completion log)
4. `revalidatePath('/')` to refresh dashboard

## Route groups

```
src/app/
├── layout.tsx           # Root: Geist fonts, ThemeProvider
└── (app)/
    ├── layout.tsx       # AppSidebar + MobileNav + main
    ├── page.tsx         # Dashboard
    └── analytics/
        └── page.tsx     # Analytics
```

`(app)` is a route group — URLs remain `/` and `/analytics`.

## Data model

```mermaid
erDiagram
  Business ||--o{ Project : has
  Business ||--o{ Task : has
  Business ||--o{ DailyTask : has
  Project ||--o{ Task : has

  Business {
    string id PK
    string name
    string slug UK
    string iconKey
    string logoUrl
  }

  Project {
    string id PK
    string businessId FK
    string name
    enum status
  }

  Task {
    string id PK
    string businessId FK
    string projectId FK
    string title
    enum status
  }

  DailyTask {
    string id PK
    string businessId FK
    string title
    string iconKey
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

## Key libraries

| Library | Usage |
|---------|--------|
| `motion` | Page/card stagger, checklist animations |
| `recharts` | Analytics bar charts only |
| `date-fns` | Formatting, week boundaries, date ranges |
| `zod` | Server Action input validation |
| `lucide-react` | Icons via `iconKey` string lookup |

## File upload

- Server Action: `src/app/actions/upload.ts`
- Writes to `public/uploads/` with UUID filename
- Max 2MB; PNG, JPG, WEBP, SVG
- Returns path like `/uploads/{uuid}.png` stored on `Business.logoUrl`

## Docker services

| Service | Image / build | Port | Role |
|---------|---------------|------|------|
| `db` | `postgres:16-alpine` | 5432 | Persistent Postgres |
| `app` | `Dockerfile` (standalone Next) | 9999 | App + auto migrate |

Volumes: `postgres_data`, `uploads_data`.

## Performance notes

- Dashboard and analytics pages use `export const dynamic = 'force-dynamic'`
- Analytics queries are bounded (14-day window, 7-day daily stats, top 20 completions on dashboard)
- Prisma client singleton in `src/lib/prisma.ts` (dev hot-reload safe)
