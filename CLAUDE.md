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
docker compose up -d           # pull ghcr.io/baselhusam/daily-hub:latest
docker compose up -d --build   # compile from this tree

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

- **Project** → first-class workstream; has Tasks and Milestones. `color` + `colorSource` (`"auto" | "manual"`) hold its accent: `auto` means it was derived from the logo and should be re-derived when the logo changes, `manual` means the user picked it and it must never be overwritten. A `null` `color` is resolved to a palette colour at **read** time via `projectAccent()` in `src/lib/entity-colors.ts` — never stored, so "reset to default" keeps working.
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

## macOS app

`./scripts/build-macos-app.sh` produces `dist/DailyHub.app` — a Dock icon and a
Spotlight entry for the app, not a packaged build. The bundle holds a shell
launcher, an icon, and nothing else: it starts the normal CLI in the background
and opens the UI in the browser. Pass `--app-mode` for a chromeless Chrome window
instead of a tab.

```
scripts/macos/launcher.sh    # what runs on double-click
scripts/macos/Info.plist     # version substituted at build time
scripts/macos/icon.svg       # 1024x1024 source, rasterised by headless Chrome
```

Two things the launcher has to get right, both easy to regress:

- **A `.app` opened from Finder inherits `PATH=/usr/bin:/bin:/usr/sbin:/sbin`.**
  Homebrew, nvm, Volta and `~/.local/bin` are all invisible, so the launcher
  resolves `node` itself before it can run anything.
- **`npx` resolves against the current working directory** and will happily serve
  a stale cached build — from a checkout of this repo it can run a CLI old enough
  to have no `start` command. The launcher `cd`s somewhere neutral and pins
  `@latest`. Don't drop either.

It is a launcher, not an app: no window of its own, no bundled runtime, and
closing the browser leaves the server running (`daily-hub stop` ends it). A real
Electron build would need the Prisma query engine pre-bundled per architecture and
signed individually under the hardened runtime, since the runtime
`prisma generate` fallback in `src/cli/prisma-support.ts` cannot work inside a
signed bundle.

## Publishing

Package: [`@baselhusam/daily-hub`](https://www.npmjs.com/package/@baselhusam/daily-hub)  
Image: [`ghcr.io/baselhusam/daily-hub`](https://github.com/baselhusam/daily-hub/pkgs/container/daily-hub)

Publishing is automatic on GitHub Releases. npm uses trusted publishing (OIDC) — no `NPM_TOKEN`. GHCR uses `GITHUB_TOKEN` (`packages: write`) — no Docker Hub credentials.

1. Update [`CHANGELOG.md`](CHANGELOG.md) under **Unreleased** (or add the new version section).
2. Bump `"version"` in `package.json` **and `package-lock.json`** (it carries the version twice), and commit.
3. Push to `main`.
4. Create a GitHub Release titled `DailyHub vX.Y.Z`, tagged `vX.Y.Z` matching that version.

### Release notes

The release body is **not** the `CHANGELOG` section pasted in — the changelog is an
exhaustive reference, the release note is a ranked summary. Write it separately, in
this shape (see [v0.1.10](https://github.com/baselhusam/daily-hub/releases/tag/v0.1.10)):

```markdown
## ✨ Highlights

- **Bold lead** — one or two sentences on what it does for the user.

## 🛠️ Improvements & fixes

- Short, plain bullets. No bold leads.

## ⬆️ Upgrade notes

- Only when a release migrates the schema or touches existing data.

## ✅ Verification

- Production build, typecheck, and all N tests pass.

Thanks for using DailyHub! 🗓️
```

- Aim for **3–6 highlights**, ordered by what a user notices first. Everything else
  drops to Improvements & fixes.
- Keep bullets to a sentence or two. Detail belongs in `CHANGELOG.md`.
- Don't list a fix for a feature that ships in the same release — the bug was never
  in a published version. Fold it into the feature's own bullet.
- **Upgrade notes are required** whenever the release adds a migration or runs a
  backfill. Name what runs, say what it will not touch, and say what the user must
  do by hand (usually nothing). [v0.1.5](https://github.com/baselhusam/daily-hub/releases/tag/v0.1.5)
  is the precedent for a breaking one.
- Only claim what was actually run in **Verification** — drop the production build
  from the line if the build was skipped.

The [Publish](.github/workflows/publish.yml) workflow then:

- Builds via `prepack` and runs `npm publish`
- Builds `linux/amd64` + `linux/arm64` and pushes `ghcr.io/baselhusam/daily-hub:X.Y.Z`

Stable releases also move npm `latest` and the image tag `:latest`. Prereleases use the npm `next` dist-tag and image tag `:next` (they do not move `:latest`). The first GHCR package may be private — set it to public in GitHub Packages settings after the first push.

The marketing site in [`site/`](site/) deploys to [GitHub Pages](https://baselhusam.github.io/daily-hub/).

Test the tarball locally before cutting a release:

```bash
npm pack
npx ./baselhusam-daily-hub-0.1.5.tgz
```

## Further reading

- [docs/PROJECT.md](docs/PROJECT.md) — purpose and goals
- [docs/SCOPE.md](docs/SCOPE.md) — in/out of scope
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — technical design
- [docs/DESIGN.md](docs/DESIGN.md) — visual and UX direction
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Docker and hosting
