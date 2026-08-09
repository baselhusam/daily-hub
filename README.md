# DailyHub

A minimal daily dashboard for organizing businesses, projects, ad-hoc tasks, and recurring daily checklists.

## Features

- **Businesses** with name, icon, and optional logo upload
- **Projects** nested under businesses
- **Tasks** attached to a business, project, or inbox (none)
- **Daily tasks** with icons for recurring habits (e.g. publish a Medium post)
- **Completion log** that records finished work automatically
- **Light / dark theme** with a clean neutral UI
- **Single-page dashboard** — no navigation required

## Tech Stack

- Next.js 15 (App Router, Server Actions)
- PostgreSQL 16 + Prisma
- Tailwind CSS + shadcn/ui
- Motion for subtle UI animations
- Docker Compose for local and production-style runs

## Quick Start (Docker)

Run the full stack on port **9999**:

```bash
docker compose up --build
```

Open [http://localhost:9999](http://localhost:9999).

The app container runs migrations on startup. To seed sample data after first boot:

```bash
docker compose exec app npm run db:seed
```

## Local Development

### 1. Start PostgreSQL

```bash
docker compose up -d db
```

### 2. Configure environment

```bash
cp .env.example .env
```

### 3. Install dependencies

```bash
npm install
```

### 4. Migrate and seed

```bash
npm run db:migrate:dev
npm run db:seed
```

### 5. Run the app

```bash
npm run dev
```

Visit [http://localhost:9999](http://localhost:9999).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 9999 |
| `npm run build` | Production build |
| `npm run start` | Start production server on port 9999 |
| `npm run lint` | Run ESLint |
| `npm run db:migrate:dev` | Create/apply migrations in dev |
| `npm run db:migrate` | Apply migrations in production |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Open Prisma Studio |

## Project Structure

```
src/
├── app/
│   ├── actions/        # Server Actions (CRUD + completions)
│   ├── page.tsx        # Dashboard page
│   └── layout.tsx
├── components/
│   ├── dashboard/      # Dashboard UI
│   └── ui/             # shadcn/ui primitives
└── lib/
    ├── dashboard.ts    # Dashboard data loader
    ├── prisma.ts
    └── validations.ts
prisma/
├── schema.prisma
└── seed.ts
```

## Deployment Notes

- The Dockerfile uses Next.js `standalone` output.
- `docker compose up` runs PostgreSQL + the app together.
- Uploaded logos are stored in `public/uploads/` (persisted via Docker volume in compose).
- This is a **single-user, self-hosted** app with no authentication in v1.

## License

MIT
