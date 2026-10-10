<p align="center">
  <a href="https://baselhusam.github.io/daily-hub/">
    <img src="docs/assets/banner.png" alt="DailyHub — a quiet workspace that keeps the day in one place." width="100%">
  </a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@baselhusam/daily-hub"><img src="https://img.shields.io/npm/v/@baselhusam/daily-hub?style=flat&color=2383E2" alt="npm version"></a>
  <a href="https://hub.docker.com/r/baselhusam/daily-hub"><img src="https://img.shields.io/docker/v/baselhusam/daily-hub?sort=semver&style=flat&logo=docker&label=Docker%20Hub&color=2496ED" alt="Docker Hub image version"></a>
  <a href="https://github.com/baselhusam/daily-hub/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/baselhusam/daily-hub/ci.yml?style=flat&label=CI" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/baselhusam/daily-hub?style=flat&color=37352F" alt="MIT License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/@baselhusam/daily-hub?style=flat" alt="Node.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript"></a>
</p>

<p align="center">
  <a href="https://baselhusam.github.io/daily-hub/">Website</a>
  ·
  <a href="https://www.npmjs.com/package/@baselhusam/daily-hub">npm</a>
  ·
  <a href="https://hub.docker.com/r/baselhusam/daily-hub">Docker Hub</a>
  ·
  <a href="https://github.com/baselhusam/daily-hub/pkgs/container/daily-hub">GHCR</a>
  ·
  <a href="docs/DEPLOYMENT.md">Docs</a>
  ·
  <a href="CHANGELOG.md">Changelog</a>
  ·
  <a href="https://baselhusam.com">Author</a>
</p>

---

A personal command center for people who juggle **more than one project at a time** — founders, consultants, indie builders, anyone with client work, side projects, and a few non-negotiable daily habits.

DailyHub is not a replacement for Linear, Jira, or Notion. It is the **morning surface**: what is open, what belongs where, what must happen today, and what you already finished.

## See it in action

<p align="center">
  <a href="https://youtu.be/cAzb6aWz-hM">
    <img src="docs/assets/gallery/youtube-thumbnail.png" alt="Watch the DailyHub demo on YouTube" width="100%">
  </a>
</p>

## A closer look

<p align="center">
  <img src="docs/assets/gallery/02-today.png" alt="The Today view: greeting, quick add, momentum, open work grouped by project, and today's habits." width="100%">
</p>

<table>
  <tr>
    <td width="50%"><img src="docs/assets/gallery/03-focus.png" alt="Focus mode pins projects and tasks so Today narrows to what matters."></td>
    <td width="50%"><img src="docs/assets/gallery/04-projects.png" alt="The Projects list with progress, next milestone and ship date for each project."></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/assets/gallery/05-project.png" alt="A project page with progress, milestones and a completion rhythm chart."></td>
    <td width="50%"><img src="docs/assets/gallery/06-habits.png" alt="The Habits view with weekly schedules, 14-day history and chains."></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/assets/gallery/07-analytics.png" alt="Analytics: tasks closed, habits kept, focus hours and project rhythm over the last 30 days."></td>
    <td width="50%"><img src="docs/assets/gallery/08-light-dark.png" alt="DailyHub in light and dark themes, side by side."></td>
  </tr>
</table>

## Features

- **Today** — greeting, quick add, nudges, today’s habits, open work by project, and an inbox
- **Projects** — status, due dates, milestones, and stalled-work banners
- **Focus mode** — pin projects or tasks so Today narrows to what matters, until a date or until you clear it
- **Habits** — weekday schedules, 14-day consistency, and completion rate
- **Analytics** — completions over time, project breakdown, and weekday patterns
- **Command palette** — jump to projects, tasks, habits, and milestones
- **Local by default** — SQLite on disk, light and dark themes, no accounts

## Quick start

Requires [Node.js 22+](https://nodejs.org/).

```bash
npx @baselhusam/daily-hub
```

Opens [http://127.0.0.1:9999](http://127.0.0.1:9999). Data lives in `~/.daily-hub/` (`data.db` and `uploads/`). The first download is ~80 MB because the package ships the full Next.js app; later runs are instant.

```bash
npx @baselhusam/daily-hub --seed               # sample data on first run
npx @baselhusam/daily-hub --port 3000          # different port
npx @baselhusam/daily-hub --data-dir ~/my-hub  # custom data directory
npx @baselhusam/daily-hub --no-open            # don't open the browser
npx @baselhusam/daily-hub --no-mcp             # disable the local MCP endpoint
npx @baselhusam/daily-hub --detach             # run in the background
npx @baselhusam/daily-hub --update             # run the latest published version
```

`--update` (or `update`) fetches and runs the latest published DailyHub release. Any other options are preserved, so `npx @baselhusam/daily-hub --update --port 3000` updates and starts it on port 3000.

`--detach` starts DailyHub in the background, opens the app when it is ready, and lets you close the terminal. Manage that instance later with:

```bash
npx @baselhusam/daily-hub status
npx @baselhusam/daily-hub logs
npx @baselhusam/daily-hub stop
```

The background process and log are recorded in the selected data directory (`~/.daily-hub/` by default); pass the same `--data-dir` to the management commands if you use a custom location. It remains running until stopped or the computer restarts; use Docker or a system service if you need automatic restarts.

### MCP integration

DailyHub starts a local, token-protected MCP endpoint by default at `/mcp` on the selected app port. After starting the app, print a ready-to-copy client configuration with:

```bash
npx @baselhusam/daily-hub mcp
```

The endpoint is bound to `127.0.0.1` and requires the bearer token in that output. The token is stored with owner-only permissions in `~/.daily-hub/daily-hub-mcp.json`. Disable the endpoint for a launch with `--no-mcp`.

Do not keep `~/.daily-hub/` in iCloud, Dropbox, or other file-sync folders — SQLite and file sync can corrupt the database. Backup is a copy of that folder (or your `--data-dir`).

### Docker

```bash
docker run -d --name dailyhub -p 9999:9999 \
  -v dailyhub_data:/app/data \
  baselhusam/daily-hub:latest
```

Open [http://localhost:9999](http://localhost:9999). Data persists in the `dailyhub_data` volume. The command above pulls from [Docker Hub](https://hub.docker.com/r/baselhusam/daily-hub); pin a version with `baselhusam/daily-hub:X.Y.Z` (same as the npm version). The same tags are also published to [GHCR](https://github.com/baselhusam/daily-hub/pkgs/container/daily-hub) as `ghcr.io/baselhusam/daily-hub`. Optional sample data:

```bash
docker exec dailyhub npm run db:seed
```

From a clone, `docker compose up -d` pulls the same image; `docker compose up --build` compiles from this tree.

v1 has **no authentication**. Keep it on localhost, a private network, or behind a reverse proxy. Full self-hosting notes are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Development

```bash
npm install
npm run dev
```

Runs on port **9999** with SQLite in `./.data/`. Commands, layout, and conventions live in [CLAUDE.md](CLAUDE.md).

## Built with

Next.js 15, TypeScript, SQLite, and Prisma. There is no separate API server — reads go through Server Components, writes through Server Actions.

## Documentation

- [Deployment](docs/DEPLOYMENT.md) — Docker, env vars, self-hosting, troubleshooting
- [Architecture](docs/ARCHITECTURE.md) — data model and request flow
- [Design](docs/DESIGN.md) — visual direction and UX patterns
- [Changelog](CHANGELOG.md) — version history

## License

[MIT](LICENSE) © [Basel Husam](https://baselhusam.com)
