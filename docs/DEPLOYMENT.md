# Deployment

How to run DailyHub locally, with `npx`, Docker, and on a server.

## Requirements

- **Node 22+** for `npx daily-hub` or local development
- **Docker** & Docker Compose for the Postgres self-host path
- **Port 9999** exposed for the web app
- **Port 5432** for PostgreSQL (local dev only if not using Docker networking)

## Environment variables

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | Yes | `postgresql://dailyhub:dailyhub@localhost:5432/dailyhub` or `file:/path/to/data.db` |
| `DAILYHUB_DATA_DIR` | No | `~/.daily-hub` for npx, `/app/data` in Docker |

Copy from template:

```bash
cp .env.example .env
```

### Docker Compose values

| Context | `DATABASE_URL` host |
|---------|---------------------|
| Local dev (`npm run dev`) | `localhost` |
| App container (`docker compose`) | `db` |

## Option A — npx (SQLite, zero Docker)

Run DailyHub as a local desktop app:

```bash
npx @baselhusam/daily-hub
```

- App: http://localhost:9999
- Data directory: `~/.daily-hub/`
- Database file: `~/.daily-hub/data.db`
- Uploads: `~/.daily-hub/uploads/`

Useful flags:

```bash
npx daily-hub --port 3000
npx daily-hub --data-dir ~/my-daily-hub
npx daily-hub --no-open
npx daily-hub --seed
npx daily-hub seed
```

Notes:

- Do not sync `~/.daily-hub/` through iCloud, Dropbox, or similar services. SQLite and file sync can corrupt the database.
- Backup = copy the entire data directory.
- Docker Postgres data and npx SQLite data are separate workspaces. There is no built-in migration between them.

## Option B — Full stack with Docker (Postgres)

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
| `postgres_data` | PostgreSQL database files |
| `uploads_data` | Uploaded project and habit logos (`/app/data/uploads`) |

## Option C — Local development (Postgres)

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

## Option D — Local development (SQLite)

No Docker required:

```bash
npm install
npm run dev:sqlite
```

This stores data in `./.data/`.

## Option E — Production build (Postgres host)

```bash
npm run build
npm run db:migrate
npm run start
```

Requires `DATABASE_URL` pointing to a running Postgres instance.

## Dockerfile overview

Multi-stage build:

1. `deps` — `npm ci` + Prisma generate (Postgres + SQLite clients)
2. `builder` — `next build` (standalone output)
3. `runner` — minimal Node image, runs `prisma migrate deploy && node server.js`

- Exposes port **9999**
- Runs as non-root user `nextjs`
- `output: "standalone"` in `next.config.ts`
- Uploads and runtime files use `DAILYHUB_DATA_DIR=/app/data`

## Self-hosting on a VPS

Typical steps:

1. Clone repo on server
2. Set `DATABASE_URL` in `.env` or compose override
3. `docker compose up -d --build`
4. Put Caddy/Nginx in front if you need HTTPS on port 443 (reverse proxy to `localhost:9999`)

**Security notes for v1:**

- No built-in auth — use network-level protection (VPN, firewall, basic auth at proxy) if exposed to the internet
- Uploaded logos are served from `/uploads/*` via the app runtime

## Health checks

| Check | Command |
|-------|---------|
| App responds | `curl -s -o /dev/null -w "%{http_code}" http://localhost:9999` |
| DB healthy | `docker compose ps` (db healthcheck) |
| Migrations applied | `docker compose exec app node node_modules/prisma/build/index.js migrate status` |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `P1001` Can't reach database | Wait for Postgres healthcheck; verify `DATABASE_URL` host |
| Port 9999 in use | Use `npx daily-hub --port 3000` or change port in `package.json` / `docker-compose.yml` |
| Empty dashboard after deploy | Run `npm run db:seed` or create data via UI |
| Logos missing after rebuild | Ensure `uploads_data` volume is attached |
| Build fails on Prisma | Run `npm run db:generate` before `npm run build` |
| Query engine missing (`darwin-arm64` / `debian-openssl`) | Update to the latest `@baselhusam/daily-hub`. The CLI ships engines for macOS, Windows, and Linux, and generates a native engine if one is missing. |
| `SQLITE_BUSY` on npx | Restart the app; ensure `~/.daily-hub` is on local disk, not a synced folder |

## CI suggestion

```bash
npm ci
npm run db:generate
npm run lint
npm run build
```

Database integration tests are not included in v1.
