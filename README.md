<p align="center">
  <img src="docs/assets/banner.png" alt="DailyHub — a quiet workspace that keeps the day in one place." width="100%">
</p>

<p align="center">
  <strong>A personal command center for projects, tasks, and daily habits.</strong><br>
  <sub>Single-user · self-hosted · Next.js 15 · PostgreSQL 16 · Docker</sub>
</p>

<p align="center">
  <a href="https://github.com/baselhusam/daily-hub">Repository</a>
  ·
  <a href="docs/DEPLOYMENT.md">Deploy</a>
  ·
  <a href="docs/DESIGN.md">Design</a>
  ·
  <a href="https://baselhusam.com">Author</a>
</p>

---

DailyHub is for people who juggle **more than one project at a time** — founders, consultants, indie builders, anyone with client work, side projects, and a few non-negotiable daily habits.

It is not a replacement for Linear, Jira, or Notion. It is the **morning surface**: what is open, what belongs where, what must happen today, and what you already finished.

Local app: [http://localhost:9999](http://localhost:9999)

## Surfaces

| Page | Route | What you see |
|------|-------|----------------|
| **Today** | `/` | Greeting, quick add, nudges, snapshot stats, today’s habits, open work by project, inbox |
| **Projects** | `/projects` | Projects with progress, due dates, milestones, stalled banners |
| **Habits** | `/daily` | Recurring checklist with weekday schedules, 14-day consistency, completion % |
| **Analytics** | `/analytics` | Completions over time, project breakdown, habit rates, weekday patterns |

Desktop uses a left sidebar; smaller screens use a bottom tab bar. Light and dark themes are built in.

## What you can track

- **Projects** — name, icon, optional logo, status, due date, milestones
- **Tasks** — attached to a project or the inbox
- **Daily tasks** — recurring habits with icons and weekday schedules
- **Completion log** — written automatically when you check something off, then charted on Analytics

Create and edit from dialogs. Check a box and it is done for today — no ceremony.

## Quick start

**Docker (app + Postgres) — recommended**

```bash
docker compose up --build
```

Open [http://localhost:9999](http://localhost:9999). Optional sample data:

```bash
docker compose exec app npm run db:seed
```

**Local development** (Postgres in Docker, Next.js on the host)

```bash
docker compose up -d db
cp .env.example .env
npm install
npm run db:migrate:dev
npm run db:seed
npm run dev
```

v1 has **no authentication**. Keep it on localhost, a private network, or behind a VPN / reverse-proxy. Details and self-hosting notes live in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 15 (App Router, Server Actions) |
| Language | TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| UI | Tailwind CSS v4, shadcn/ui, Motion |
| Charts | Recharts |
| Runtime | Node 22, port **9999** |

There is no separate API server. Reads go through Server Components; writes go through Server Actions.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 9999 |
| `npm run build` | Production build |
| `npm run start` | Production server on port 9999 |
| `npm run lint` | ESLint |
| `npm run db:migrate:dev` | Dev migrations |
| `npm run db:migrate` | Production migrations |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Prisma Studio |

## Documentation

| Document | Read when you need… |
|----------|---------------------|
| [CLAUDE.md](CLAUDE.md) | Commands, layout, and conventions for AI assistants |
| [docs/PROJECT.md](docs/PROJECT.md) | Purpose, goals, and who it is for |
| [docs/SCOPE.md](docs/SCOPE.md) | What is in v1 — and what is intentionally out |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data model, request flow, Docker services |
| [docs/DESIGN.md](docs/DESIGN.md) | Visual direction, layout, and UX patterns |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, env vars, self-hosting, troubleshooting |

## Layout

```
src/
├── app/
│   ├── layout.tsx            # Fonts, theme
│   ├── (app)/                # Today, Projects, Habits, Analytics
│   └── actions/              # Server Actions
├── components/               # Shell, dashboard, projects, daily, analytics, ui
└── lib/                      # Data loaders, Prisma, validation
prisma/
├── schema.prisma
└── seed.ts
docker-compose.yml
Dockerfile
```

## License

MIT © [Basel Husam](https://baselhusam.com)
