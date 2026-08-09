# DailyHub

A minimal daily dashboard for organizing businesses, projects, ad-hoc tasks, and recurring daily checklists — with analytics for tracking performance over time.

**Live local:** http://localhost:9999 · **Repo:** https://github.com/baselhusam/daily-hub

## What it does

DailyHub is a **single-user, self-hosted** hub for people working across multiple businesses and projects. See open work at a glance, complete daily habits, and review what you finished — without heavy project-management overhead.

| Area | Description |
|------|-------------|
| **Dashboard** (`/`) | Businesses, projects, inbox tasks, daily checklist, completion feed |
| **Analytics** (`/analytics`) | Charts and stats for tasks, businesses, projects, and daily habits |

## Features

- Businesses with name, icon, and optional logo upload
- Projects nested under businesses
- Tasks attached to a business, project, or inbox (none)
- Daily tasks with icons (e.g. Medium post habit)
- Automatic completion logging
- Light / dark theme, minimal neutral UI
- Left sidebar navigation + mobile top nav
- Docker Compose full stack on port **9999**

## Tech stack

Next.js 15 · PostgreSQL 16 · Prisma · Tailwind CSS v4 · shadcn/ui · Motion · Recharts

## Quick start

**Docker (full stack):**

```bash
docker compose up --build
```

Open http://localhost:9999. Optional seed:

```bash
docker compose exec app npm run db:seed
```

**Local development:**

```bash
docker compose up -d db
cp .env.example .env
npm install
npm run db:migrate:dev
npm run db:seed
npm run dev
```

## Documentation

| Document | Contents |
|----------|----------|
| [CLAUDE.md](CLAUDE.md) | AI assistant guide (commands, structure, conventions) |
| [docs/PROJECT.md](docs/PROJECT.md) | Purpose, goals, target user |
| [docs/SCOPE.md](docs/SCOPE.md) | In scope / out of scope for v1 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Data model, request flow, Docker services |
| [docs/DESIGN.md](docs/DESIGN.md) | Visual direction, layout, UX patterns |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, env vars, self-hosting, troubleshooting |

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

## Project structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── (app)/
│   │   ├── layout.tsx       # Sidebar shell
│   │   ├── page.tsx         # Dashboard
│   │   └── analytics/       # Analytics page
│   └── actions/             # Server Actions
├── components/
│   ├── app-sidebar.tsx
│   ├── dashboard/
│   ├── analytics/
│   └── ui/                  # shadcn/ui
└── lib/
    ├── dashboard.ts
    ├── analytics.ts
    ├── prisma.ts
    └── validations.ts
prisma/
├── schema.prisma
└── seed.ts
docker-compose.yml
Dockerfile
```

## Author

Built by [Basel Husam](https://baselhusam.com).

## License

MIT
