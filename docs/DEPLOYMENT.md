# Deployment

How to run DailyHub locally, with `npx`, Docker, and on a server.

## Requirements

- **Node 22+** for `npx daily-hub` or local development
- **Docker** & Docker Compose for the Postgres self-host path
- **Port 9999** exposed for the web app
- **Port 5432** only when using the dev overlay for host-side Postgres access

## Environment variables

| Variable | Required | Example |
|----------|----------|---------|
| `POSTGRES_PASSWORD` | Yes (Docker / Postgres dev) | A strong secret you choose |
| `DATABASE_URL` | Yes | `postgresql://dailyhub:YOUR_PASSWORD@localhost:5432/dailyhub` or `file:/path/to/data.db` |
| `DAILYHUB_DATA_DIR` | No | `~/.daily-hub` for npx, `/app/data` in Docker |

Copy from template:

```bash
cp .env.example .env
```

Set `POSTGRES_PASSWORD` and use the **same password** in `DATABASE_URL`. Compose does not expand `${POSTGRES_PASSWORD}` inside `DATABASE_URL` for host `npm run dev`.

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

Starts PostgreSQL + Next.js app. Postgres is **not** published to the host by default.

```bash
cp .env.example .env   # set POSTGRES_PASSWORD
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

If you already have a `postgres_data` volume from an older setup, keep using the same `POSTGRES_PASSWORD` Postgres was initialized with. Changing `.env` alone does not rotate the role password inside an existing volume.

### Persistent data

| Volume | Contents |
|--------|----------|
| `postgres_data` | PostgreSQL database files |
| `uploads_data` | Uploaded project and habit logos (`/app/data/uploads`) |

## Option C — Local development (Postgres)

Database in Docker (with host port 5432), app on host:

```bash
cp .env.example .env   # set POSTGRES_PASSWORD and match DATABASE_URL
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
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
2. Copy `.env.example` to `.env` and set `POSTGRES_PASSWORD` (and `DATABASE_URL` if running the app outside Compose)
3. `docker compose up -d --build`
4. Put Caddy/Nginx in front if you need HTTPS on port 443 (reverse proxy to `localhost:9999`)

**Security notes for v1:**

- No built-in auth — keep the instance on localhost, a private network, or behind a VPN / reverse-proxy
- Postgres is not exposed on the host in the default Compose stack
- Uploaded logos are served from `/uploads/*`; SVG responses use `nosniff` and a sandboxed document CSP
- App responses include CSP, `X-Frame-Options`, and `Referrer-Policy` headers

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
| `Set POSTGRES_PASSWORD in .env` on compose up | Copy `.env.example` and set a password before `docker compose up` |
| Port 9999 in use | Use `npx daily-hub --port 3000` or change port in `package.json` / `docker-compose.yml` |
| Empty dashboard after deploy | Run `npm run db:seed` or create data via UI |
| Logos missing after rebuild | Ensure `uploads_data` volume is attached |
| Build fails on Prisma | Run `npm run db:generate` before `npm run build` |
| Query engine missing (`darwin-arm64` / `debian-openssl`) | Update to the latest `@baselhusam/daily-hub`. The CLI ships engines for macOS, Windows, and Linux, and generates a native engine if one is missing. |
| `SQLITE_BUSY` on npx | Restart the app; ensure `~/.daily-hub` is on local disk, not a synced folder |

## CI

Pull requests and pushes to `main` run [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

```bash
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run build
```

Database integration tests are not included in v1.
