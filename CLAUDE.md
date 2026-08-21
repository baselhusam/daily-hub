# CLAUDE.md

Guidance for AI assistants (Claude, Cursor, etc.) working in the DailyHub repository.

## Project overview

DailyHub is a **single-user, self-hosted** productivity web app for organizing work across projects. Users track ad-hoc tasks, recurring daily habits, and see completion history — with a separate Analytics view for performance insights.

**Repository:** https://github.com/baselhusam/daily-hub  
**Local URL:** http://localhost:9999

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router, Server Actions) |
| Language | TypeScript (strict) |
| Database | SQLite (`data.db` in a data directory) |
| ORM | Prisma |
| UI | Tailwind CSS v4, shadcn/ui (new-york), Motion |
| Charts | Recharts (Analytics page only) |
| Runtime | Node 22, port **9999** |

**No separate backend** — mutations use Server Actions, not REST/FastAPI.

## Commands

```bash
# Dev (SQLite in ./.data/)
npm install
npm run dev                    # http://localhost:9999

# Quality
npm run lint
npm run typecheck
npm test
npm run build

# Full stack (Docker, SQLite volume)
docker compose up --build

# Seed inside Docker app container
docker compose exec app npm run db:seed
```

## Repository layout

```
src/
├── app/
│   ├── layout.tsx              # Root: fonts, ThemeProvider
│   ├── (app)/
│   │   ├── layout.tsx          # Sidebar + mobile nav shell
│   │   ├── page.tsx            # Today (/)
│   │   └── analytics/page.tsx  # Analytics (/analytics)
│   └── actions/                # Server Actions (mutations)
├── components/
│   ├── app-sidebar.tsx         # Left nav + quick stats
│   ├── dashboard/              # Dashboard UI
│   ├── analytics/              # Charts and analytics UI
│   └── ui/                     # shadcn primitives — prefer extending, not rewriting
└── lib/
    ├── dashboard.ts            # Dashboard data loader
    ├── analytics.ts            # Analytics aggregations
    ├── sidebar-stats.ts        # Sidebar quick stats
    ├── prisma.ts               # Prisma singleton (SQLite only)
    ├── data-dir.ts             # DAILYHUB_DATA_DIR + uploads path
    ├── validations.ts          # Zod schemas for actions
    └── dates.ts                # Local-day helpers (getTodayDate)
prisma/
├── schema.prisma               # SQLite schema
├── seed.ts
└── migrations/
```

## Data model (summary)

- **Project** → first-class workstream; has Tasks and Milestones
- **Task** → optional `projectId`; inbox = no project
- **DailyTask** → recurring checklist item with icon; completion state is per-day in `CompletionLog`
- **CompletionLog** → polymorphic via `entityType` (`TASK` | `DAILY_TASK`) + `entityId` + `completedOn` (date)

**Important:** `CompletionLog` has **no FK** to Task/DailyTask — `entityId` is logical only. Do not re-add a Prisma relation on `entityId`.

## Product constraints (do not violate without explicit request)

1. **Single-user, no auth** in v1
2. **Minimal neutral UI** — light/dark only; no loud colors or heavy decoration
3. **Port 9999** for local and Docker exposure
4. **One-shot dashboard focus** — main work happens on `/`; Analytics is `/analytics`
5. **Logo uploads** go to `DAILYHUB_DATA_DIR/uploads/` via `src/app/actions/upload.ts`

## UI / UX conventions

- Use existing shadcn components in `src/components/ui/`
- Theme via `next-themes`; CSS variables in `src/app/globals.css` (oklch neutrals)
- Motion for subtle entrance/checkbox feedback — not excessive animation
- Server Components for data loading; client components for interactivity and charts
- After mutations: `revalidatePath('/')` (and `/analytics` if analytics data changes)

## Adding features (typical flow)

1. Update `prisma/schema.prisma` if schema changes → `npm run db:migrate:dev`
2. Add Zod schema in `src/lib/validations.ts`
3. Add Server Action in `src/app/actions/`
4. Extend data loader in `src/lib/dashboard.ts` or `src/lib/analytics.ts`
5. Build UI in `src/components/dashboard/` or `src/components/analytics/`
6. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`

## Environment

```env
DATABASE_URL="file:./.data/data.db"
DAILYHUB_DATA_DIR="./.data"
```

Docker uses `DATABASE_URL=file:/app/data/data.db` and `DAILYHUB_DATA_DIR=/app/data`.

## Further reading

- [docs/PROJECT.md](docs/PROJECT.md) — purpose and goals
- [docs/SCOPE.md](docs/SCOPE.md) — in/out of scope
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — technical design
- [docs/DESIGN.md](docs/DESIGN.md) — visual and UX direction
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Docker and hosting
