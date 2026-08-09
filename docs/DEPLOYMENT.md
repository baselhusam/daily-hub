# Deployment

How to run DailyHub locally, with Docker, and on a server.

## Requirements

- **Docker** & Docker Compose (recommended), or Node 22+ and PostgreSQL 16
- **Port 9999** exposed for the web app
- **Port 5432** for PostgreSQL (local dev only if not using Docker networking)

## Environment variables

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | Yes | `postgresql://dailyhub:dailyhub@localhost:5432/dailyhub` |

Copy from template:

```bash
cp .env.example .env
```

### Docker Compose values

| Context | `DATABASE_URL` host |
|---------|---------------------|
| Local dev (`npm run dev`) | `localhost` |
| App container (`docker compose`) | `db` |

## Option A — Full stack with Docker (recommended)

Starts PostgreSQL + Next.js app:

```bash
docker compose up --build
```

- App: http://localhost:9999
- Migrations run automatically on app container start (`prisma migrate deploy`)

**First-time seed (optional):**

```bash
docker compose exec app npm run db:seed
```

**Stop:**

```bash
docker compose down
```

**Reset database (destructive):**

```bash
docker compose down -v
docker compose up --build
docker compose exec app npm run db:seed
```

### Persistent data

| Volume | Contents |
|--------|----------|
| `postgres_data` | Database files |
| `uploads_data` | Uploaded business logos |

## Option B — Local development

Database in Docker, app on host:

```bash
docker compose up -d db
cp .env.example .env
npm install
npm run db:migrate:dev
npm run db:seed
npm run dev
```

Open http://localhost:9999.

## Option C — Production build (host)

```bash
npm run build
npm run db:migrate
npm run start
```

Requires `DATABASE_URL` pointing to a running Postgres instance.

## Dockerfile overview

Multi-stage build:

1. `deps` — `npm ci` + Prisma generate
2. `builder` — `next build` (standalone output)
3. `runner` — minimal Node image, runs `prisma migrate deploy && node server.js`

- Exposes port **9999**
- Runs as non-root user `nextjs`
- `output: "standalone"` in `next.config.ts`

## Self-hosting on a VPS

Typical steps:

1. Clone repo on server
2. Set `DATABASE_URL` in `.env` or compose override
3. `docker compose up -d --build`
4. Put Caddy/Nginx in front if you need HTTPS on port 443 (reverse proxy to `localhost:9999`)

**Security notes for v1:**

- No built-in auth — use network-level protection (VPN, firewall, basic auth at proxy) if exposed to the internet
- Uploaded files in `public/uploads/` are served statically

## Health checks

| Check | Command |
|-------|---------|
| App responds | `curl -s -o /dev/null -w "%{http_code}" http://localhost:9999` |
| DB healthy | `docker compose ps` (db healthcheck) |
| Migrations applied | `docker compose exec app npx prisma migrate status` |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `P1001` Can't reach database | Wait for Postgres healthcheck; verify `DATABASE_URL` host |
| Port 9999 in use | Change port in `package.json` scripts and `docker-compose.yml` |
| Empty dashboard after deploy | Run `npm run db:seed` or create data via UI |
| Logos missing after rebuild | Ensure `uploads_data` volume is attached |
| Build fails on Prisma | Run `npx prisma generate` before `npm run build` |

## CI suggestion

```bash
npm ci
npx prisma generate
npm run lint
npm run build
```

Database integration tests are not included in v1.
