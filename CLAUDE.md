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
| Database | PostgreSQL 16 (Docker) or SQLite (`npx` / `dev:sqlite`) |
| ORM | Prisma |
| UI | Tailwind CSS v4, shadcn/ui (new-york), Motion |
| Charts | Recharts (Analytics page only) |
| Runtime | Node 22+, port **9999** |

**No separate backend** — mutations use Server Actions, not REST/FastAPI.

## Commands

```bash
# Database (Docker) — host dev needs the dev overlay for port 5432
cp .env.example .env   # set POSTGRES_PASSWORD + matching DATABASE_URL
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db

# Dev (Postgres)
npm install
npm run db:migrate:dev
npm run db:seed
npm run dev                    # http://localhost:9999

# Dev (SQLite, no Docker)
npm run dev:sqlite

# Quality
npm run lint
npm run typecheck
npm test
npm run build

# Full stack (app + db)
docker compose up --build      # requires POSTGRES_PASSWORD in .env

# Seed inside Docker app container
docker compose exec app npm run db:seed
```

## Repository layout

```
src/
├── app/
│   ├── layout.tsx              # Root: fonts, ThemeProvider
│   ├── (app)/
│   │   ├── layout.tsx          # AppShell: sidebar, search, notifications
│   │   ├── page.tsx            # Today (/)
│   │   ├── projects/page.tsx
│   │   ├── daily/page.tsx
│   │   └── analytics/page.tsx
│   ├── uploads/[filename]/     # Serve uploaded logos
│   └── actions/                # Server Actions (mutations)
├── cli/                        # npx entrypoint source
├── components/
│   ├── app-sidebar.tsx
│   ├── search-palette.tsx
│   ├── notification-bell.tsx
│   ├── dashboard/
│   ├── projects/
│   ├── daily/
│   ├── analytics/
│   └── ui/
└── lib/
    ├── dashboard.ts
    ├── analytics.ts
    ├── notifications.ts
    ├── uploaded-image.ts       # Magic-byte sniff + SVG sanitize
    ├── prisma.ts
    ├── validations.ts
    └── dates.ts
prisma/
├── schema.prisma               # Postgres (Docker / dev)
├── sqlite/schema.prisma        # SQLite (npx / CLI)
├── seed.ts
└── migrations/
bin/
└── daily-hub.js                # CLI entrypoint (built from src/cli)
```

## Data model (summary)

- **Project** → first-class workstream; has Tasks and Milestones
- **Task** → optional `projectId`; inbox = no project
- **DailyTask** → recurring checklist item with icon; completion state is per-day in `CompletionLog`
- **Settings** → single row (`id = "default"`) for greeting/workspace preferences
- **CompletionLog** → polymorphic via `entityType` (`TASK` | `DAILY_TASK`) + `entityId` + `completedOn` (date)

**Important:** `CompletionLog` has **no FK** to Task/DailyTask — `entityId` is logical only. Do not re-add a Prisma relation on `entityId`.

## Product constraints (do not violate without explicit request)

1. **Single-user, no auth** in v1
2. **Minimal neutral UI** — light/dark only; no loud colors or heavy decoration
3. **Port 9999** for local and Docker exposure
4. **One-shot Today focus** — main work happens on `/`; Analytics is `/analytics`
5. **Logo uploads** go to `DAILYHUB_DATA_DIR/uploads/` via `src/app/actions/upload.ts` (not `public/uploads/`)

## UI / UX conventions

- Use existing shadcn components in `src/components/ui/`
- Theme via `next-themes`; CSS variables in `src/app/globals.css` (oklch neutrals)
- Motion for subtle entrance/checkbox feedback — not excessive animation
- Server Components for data loading; client components for interactivity and charts
- After mutations: `revalidateApp()` (covers `/`, `/projects`, `/daily`, `/analytics`)

## Adding features (typical flow)

1. Update `prisma/schema.prisma` (and `prisma/sqlite/schema.prisma` if shared) → `npm run db:migrate:dev`
2. Add Zod schema in `src/lib/validations.ts`
3. Add Server Action in `src/app/actions/` (return `ActionResult`; use `failAction` on Prisma errors)
4. Extend data loader in `src/lib/dashboard.ts` or `src/lib/analytics.ts`
5. Build UI in the relevant `src/components/` folder
6. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`

## Environment

```env
POSTGRES_PASSWORD=your-strong-secret
DATABASE_URL="postgresql://dailyhub:your-strong-secret@localhost:5432/dailyhub"
```

Docker app service uses `postgresql://dailyhub:${POSTGRES_PASSWORD}@db:5432/dailyhub`.

## Further reading

- [docs/PROJECT.md](docs/PROJECT.md) — purpose and goals
- [docs/SCOPE.md](docs/SCOPE.md) — in/out of scope
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — technical design
- [docs/DESIGN.md](docs/DESIGN.md) — visual and UX direction
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Docker and hosting
- [CHANGELOG.md](CHANGELOG.md) — version history
