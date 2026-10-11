# Contributing to DailyHub

Thanks for helping. DailyHub is a small, single-user app with a deliberately narrow scope, so a quick issue before a large pull request saves everyone time.

## Before you start

- **Bugs**: open an issue with what you did, what you expected, and your DailyHub version (`npx @baselhusam/daily-hub --help` prints it).
- **Features**: check [docs/SCOPE.md](docs/SCOPE.md) first. Multi-user support, auth, and loud UI are out of scope for now.
- **Look and feel**: [docs/DESIGN.md](docs/DESIGN.md) describes the visual direction. Neutral colours, light and dark themes only, and only subtle animation.

## Setup

Requires Node.js 22+.

```bash
git clone https://github.com/baselhusam/daily-hub.git
cd daily-hub
npm install
npm run dev          # http://localhost:9999
```

The dev server uses its own SQLite database in `./.data/`, separate from your real `~/.daily-hub/`. Add sample data with:

```bash
DATABASE_URL=file:./.data/data.db DAILYHUB_DATA_DIR=./.data npm run db:seed
```

## Making a change

The usual path for a feature:

1. Schema change? Edit `prisma/schema.prisma`, then run `npm run db:migrate:dev`.
2. Add a Zod schema in `src/lib/validations.ts`.
3. Add a Server Action in `src/app/actions/`. There is no REST API.
4. Load data in `src/lib/dashboard.ts` or `src/lib/analytics.ts`.
5. Build the UI in `src/components/`, extending the shadcn primitives in `src/components/ui/` rather than replacing them.

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) covers the data model. `CompletionLog` deliberately has no foreign key to tasks or habits, so please don't add one.

## Checks

Run all four before opening a pull request. CI runs the same ones.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` overwrites `.next/`, so stop `npm run dev` before you run it.

## Pull requests

- Keep one change per pull request.
- Use [Conventional Commits](https://www.conventionalcommits.org) with a scope, matching the history: `feat(today): …`, `fix(cli): …`, `docs(readme): …`.
- Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md) for anything a user would notice.
- For UI changes, include a screenshot in both light and dark themes.

Releases are cut by the maintainer, so please don't bump the version.
