# Deployment

How to run DailyHub locally, with `npx`, Docker, and on a server.

## Requirements

- **Node 22+** for `npx daily-hub` or local development
- **Docker** & Docker Compose for the self-host path (optional)
- **Port 9999** exposed for the web app

## Environment variables

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | Yes | `file:./.data/data.db` |
| `DAILYHUB_DATA_DIR` | No | `~/.daily-hub` for npx, `./.data` for local dev, `/app/data` in Docker |

Copy from template:

```bash
cp .env.example .env
```

DailyHub uses **SQLite only**. `DATABASE_URL` must be a `file:` URL pointing at `data.db` inside your data directory.

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
- The same `data.db` format works for npx, local dev, and Docker.

## Option B — Docker (SQLite)

Pre-built images live at [`ghcr.io/baselhusam/daily-hub`](https://github.com/baselhusam/daily-hub/pkgs/container/daily-hub). GitHub Releases publish `linux/amd64` and `linux/arm64`.

| Tag | When it moves |
|-----|----------------|
| `X.Y.Z` (for example `0.1.5`) | Every release; matches the npm version |
| `latest` | Stable releases only |
| `next` | Prereleases only |

The first GHCR package created by Actions is often **private**. After the first successful publish, open GitHub → Packages → `daily-hub` → Package settings → change visibility to **Public**. Anonymous `docker pull` will fail until then. Repo Settings → Actions → General → Workflow permissions must allow `GITHUB_TOKEN` **read and write**.

### Pull the image

```bash
docker run -d --name dailyhub -p 9999:9999 \
  -v dailyhub_data:/app/data \
  ghcr.io/baselhusam/daily-hub:latest
```

- App: http://localhost:9999
- Migrations run automatically on container start (`prisma migrate deploy`)
- Data volume: `dailyhub_data` mounted at `/app/data` (`data.db` + `uploads/`)
- Pin a version: `ghcr.io/baselhusam/daily-hub:X.Y.Z` (same as the npm version)

**First-time seed (optional):**

```bash
docker exec dailyhub npm run db:seed
```

From a clone of this repo, Compose pulls the same image (no local compile):

```bash
docker compose up -d
```

Upgrade:

```bash
docker compose pull
docker compose up -d
```

**Stop:**

```bash
docker stop dailyhub && docker rm dailyhub
# or, from a clone:
docker compose down
```

**Reset database (destructive):**

```bash
docker compose down -v
docker compose up -d
docker compose exec app npm run db:seed
```

### Build from source (contributors)

Compose still includes a `build:` section. This compiles the `Dockerfile` in this tree and tags the result as `ghcr.io/baselhusam/daily-hub:latest` locally:

```bash
docker compose up -d --build
```

Do not set `pull_policy: always` — that would overwrite a local `--build` on the next `up`.

### Persistent data

| Volume | Contents |
|--------|----------|
| `dailyhub_data` | SQLite database (`data.db`) and uploaded logos (`uploads/`) at `/app/data` |

## Option C — Local development (no Docker)

```bash
npm install
npm run dev
```

This stores data in `./.data/` (`data.db` + `uploads/`). Open http://localhost:9999.

After pulling schema changes:

```bash
npm run db:migrate
```

If you previously used `dev:sqlite` and have `./.data/dev.db`, rename it:

```bash
mv .data/dev.db .data/data.db
```

## Option D — Production build (host)

```bash
npm run build
npm run db:migrate
npm run start
```

Requires `DATABASE_URL` pointing at a SQLite file (for example `file:./.data/data.db`).

## Dockerfile overview

Multi-stage build:

1. `deps` — `npm ci`
2. `builder` — `prisma generate`, `next build` (standalone output)
3. `runner` — minimal Node image, runs `prisma migrate deploy && node server.js`

- Exposes port **9999**
- Runs as non-root user `nextjs`
- `output: "standalone"` in `next.config.ts`
- `DATABASE_URL=file:/app/data/data.db` and `DAILYHUB_DATA_DIR=/app/data`
- Published to `ghcr.io/baselhusam/daily-hub` on GitHub Releases (`linux/amd64` + `linux/arm64`)

## Self-hosting on a VPS

Typical steps:

1. `docker run -d --name dailyhub -p 9999:9999 -v dailyhub_data:/app/data ghcr.io/baselhusam/daily-hub:latest` (or clone and `docker compose up -d`)
2. Put Caddy/Nginx in front if you need HTTPS on port 443 (reverse proxy to `localhost:9999`)

Contributors deploying from a working tree can use `docker compose up -d --build` instead of pulling.

**Security notes for v1:**

- No built-in auth — keep the instance on localhost, a private network, or behind a VPN / reverse-proxy
- Store the data volume on local disk (not NFS or synced folders)
- Uploaded logos are served from `/uploads/*`; SVG responses use `nosniff` and a sandboxed document CSP
- App responses include CSP, `X-Frame-Options`, and `Referrer-Policy` headers

## Health checks

| Check | Command |
|-------|---------|
| App responds | `curl -s -o /dev/null -w "%{http_code}" http://localhost:9999` |
| Migrations applied | `docker compose exec app node node_modules/prisma/build/index.js migrate status` or `docker exec dailyhub node node_modules/prisma/build/index.js migrate status` |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `DailyHub now uses SQLite only` | Set `DATABASE_URL` to a `file:` URL (see `.env.example`) |
| Port 9999 in use | Use `npx daily-hub --port 3000` or change port in `package.json` / `docker-compose.yml` |
| Empty dashboard after deploy | Run `npm run db:seed` or create data via UI |
| Logos missing after rebuild | Ensure `dailyhub_data` volume is attached |
| `docker compose up` fails to pull | Build locally with `docker compose up --build`, or check that the GHCR package is public |
| Build fails on Prisma | Run `npm run db:generate` before `npm run build` |
| Query engine missing (`darwin-arm64` / `debian-openssl`) | Update to the latest `@baselhusam/daily-hub`. The CLI ships engines for macOS, Windows, and Linux, and generates a native engine if one is missing. |
| `SQLITE_BUSY` / database is locked | Restart the app; ensure the data dir is on local disk, not a synced folder; remove stale `-wal`/`-shm` files if no process is running |

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

CI also builds the Docker image for `linux/amd64` (no push) so a broken `Dockerfile` fails before a release.

GitHub Releases run [`.github/workflows/publish.yml`](../.github/workflows/publish.yml): npm publish and a multi-arch push to `ghcr.io/baselhusam/daily-hub`.

Database integration tests are not included in v1.

## Upgrading from 0.1.x (breaking)

- **npx / `~/.daily-hub/data.db`:** preserved — same migration history.
- **Local `./.data/dev.db`:** rename to `./.data/data.db`.
- **Docker Postgres volumes (`postgres_data`, `uploads_data`):** not migrated automatically. Copy uploads into the new `dailyhub_data` volume if needed; recreate the database or stay on 0.1.x.
