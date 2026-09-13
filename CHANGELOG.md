# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.12] - 2026-09-13

### Added

- Projects now carry a colour. Upload or link a logo and DailyHub picks an accent from it, or choose one yourself from the palette, the colour picker, or a typed hex; the colour flows through avatars, the sidebar, and every chart.
- Pick a project's colour straight off its logo: "Pick from logo" opens the image with a magnifying loupe, and clicking a pixel takes that exact colour. The custom-colour slot now stays available even while the accent came from the logo.
- Every project has a page of its own. A project card now opens a page carrying its logo, status, description, ship date, and progress, with tiles for open and overdue work, finished tasks, milestones reached, and focus logged; a completion rhythm over 14, 30, or 90 days; and its tasks, its milestones, and the weekday shape of its work. The numbers above the chart cover the project's whole life, so narrowing the range never makes finished work disappear.
- Project rhythm on Analytics: a line per project over 14, 30, or 90 days, daily or cumulative. Every project that logged something starts visible and is drawn at the same weight, each line closing to the baseline under a wash of its own colour. The legend sits beside the plot with each project's own mark, its total, and a sparkline of the window on screen — click a row to drop a project, option-click to isolate one, and fold the quiet ones away with "Only active".
- A full-year momentum calendar, and a Daily rhythm line on Today.
- Projects on Today can be collapsed, and a project whose tasks are all finished folds itself away until there is open work again.

### Changed

- Updating an existing DailyHub now fills in project colours by itself: the first time you open the app after the update, every project that has a logo but no colour gets one derived from that logo, quietly and once. Colours set by hand before this release are recognised as deliberate and are never overwritten, and the order of projects on Today is left untouched.
- A project marked Done stays in view. It used to vanish from Today and the sidebar; both lists now keep it and sort it last, the sidebar trades its open-task count for a faint Done pill, and its card on Today starts collapsed. Done projects no longer set the next deadline, count towards the Projects tally, or raise a stalled nudge.
- A project's colour now sits in a slim rail rather than a saturated band — on the projects grid, the project hero, and the Analytics lists — so a screenful of projects reads as one family. The full colour still blooms on the row you point at.
- The three cards at the top of Today share one frame, and their charts fill the space they were given: the open-tasks bars grow with the card, and the momentum tiles lay out in three rows instead of two.
- The open-tasks chart is now interactive like the others — hover, click, or arrow-key through it for a dated breakdown.
- Charts draw themselves in, and their hover markers glide rather than jump.
- Analytics no longer emphasises things on its own. Hovering a project lights it up without dimming the rest, cards no longer light their borders from across the page, and dimming happens only once you pin something — with the Clear chip to undo it.
- Page titles are set in the body sans, tightened, instead of a pixel display face — which also drops a webfont from first paint.
- The icon picker in the project and habit dialogs is easier to search and scan.
- The theme toggle switches directly again, without the view transition added in 0.1.10.

### Fixed

- The dashboard and habits pages no longer break their layout at narrow widths.

## [0.1.11] - 2026-09-06

### Added

- Project cards on the Projects page now open that project's filtered task list.
- Completed project tasks now have the same dated history as inbox items.

### Changed

- Tightened dashboard spacing across the page header, task composer, summary cards, task rows, and project panels.

## [0.1.10] - 2026-09-03

### Added

- Local Model Context Protocol (MCP) server support, including tools for working with DailyHub data from compatible AI clients.
- `daily-hub update` and `daily-hub --update`, which fetch and run the latest published DailyHub release.

### Changed

- Projects in the sidebar can now be reordered with drag and drop; the selected project stays in place and the custom order persists.

### Fixed

- Theme changes now transition smoothly without flashes or abrupt visual changes.


## [0.1.9] - 2026-09-02

### Added

- A GitHub button in the application top bar that opens the DailyHub repository in a new tab.

### Fixed

- Today dashboard streaks now stop at the first active habit instead of counting days before habits existed.
- The Today dashboard now honors the **Show streaks** setting and reflows the remaining summary cards when streaks are hidden.

## [0.1.8] - 2026-09-02

### Added

- Add `daily-hub --detach` for starting the local `npx` app in the background, with `status`, `logs`, and `stop` lifecycle commands.

## [0.1.7] - 2026-08-30

### Fixed

- Projects on the Today dashboard now move to the top after a project, task, or milestone is changed, completed, created, or deleted.
- Empty workspaces now correctly report a 0-day habit streak instead of displaying the 400-day calculation safeguard as a real streak.
- CLI copies the host Prisma query engine into every directory the bundled Next.js client searches, and prints the installed version so a stale local `npx` copy is obvious.

### Changed

- Added regression coverage for recent project activity ordering and the empty-habits streak state.

## [0.1.6] - 2026-08-21

### Added

- GitHub Releases publish a multi-arch image to `ghcr.io/baselhusam/daily-hub` (`linux/amd64`, `linux/arm64`) with the npm version tag, plus `:latest` (stable) or `:next` (prereleases).
- CI builds the Docker image on pull requests and `main` (amd64, no push).

### Changed

- `docker-compose.yml` pulls `ghcr.io/baselhusam/daily-hub:latest` and still supports `docker compose up --build` for local builds.

## [0.1.5] - 2026-08-21

### Changed

- **Breaking:** DailyHub now uses SQLite everywhere — npx, local dev, and Docker. PostgreSQL and the dual-schema Prisma setup are removed.
- Docker Compose is a single `app` service with one volume (`dailyhub_data`) holding `data.db` and `uploads/`.
- `npm run dev` uses SQLite in `./.data/data.db` (no Docker required).

### Removed

- PostgreSQL 16 `db` service, `postgres_data` volume, `POSTGRES_PASSWORD`, and `docker-compose.dev.yml`.
- Separate `prisma/sqlite/` schema, `dev:sqlite`, and `db:migrate:sqlite*` scripts.

### Migration notes

- **npx / `~/.daily-hub/data.db`:** preserved (same init migration).
- **Local `./.data/dev.db`:** rename to `./.data/data.db`.
- **Docker Postgres volumes:** not migrated automatically. Copy uploads into the new volume if needed; recreate data or stay on 0.1.x.

## [0.1.4] - 2026-08-21

### Added

- MIT `LICENSE` file at the repository root.
- GitHub Actions CI workflow: Prisma generate, lint, typecheck, Vitest, and production build on PRs and `main`.
- Vitest suite for Zod validations, uploaded-image sniffing/sanitization, and mocked server actions.
- `not-found`, app `error`, and `global-error` pages with paper/ink styling.
- Security headers (CSP, `nosniff`, `frame-ancestors`, `Referrer-Policy`) via `next.config.ts`.
- `docker-compose.dev.yml` overlay to publish Postgres on port 5432 for host development only.

### Changed

- Logo uploads now sniff magic bytes instead of trusting `file.type`; SVG is allowlist-sanitized before storage.
- SVG uploads are served with `nosniff` and a sandboxed document CSP.
- Docker Compose requires `POSTGRES_PASSWORD` in `.env` and no longer publishes Postgres to the host by default.
- Server actions that previously threw on Prisma failures now return structured `{ success: false, error }` responses.

### Security

- Hardened self-host defaults: no default DB password in compose, no host Postgres port in the base stack.
- Reduced SVG XSS risk through server-side sanitization and response CSP.

## [0.1.3] - 2026-08-21

### Fixed

- Published CLI survives Prisma platform mismatches by generating a native query engine when needed.

## [0.1.2] - 2026-08-21

### Fixed

- Bundled Prisma query engines for macOS, Windows, and Linux in the published npm package.

## [0.1.1] - 2026-08-21

### Changed

- npm publishing runs from GitHub Releases via trusted publishing (OIDC).

### Added

- GitHub Pages marketing site with paper/ink design and Doto display typography.
- Pages deploy validation workflow.

## [0.1.0] - 2026-08-20

### Added

- Initial public npm release: `@baselhusam/daily-hub`.
- `npx` CLI with SQLite data in `~/.daily-hub/`.
- Docker Compose path with PostgreSQL 16 and migrate-on-start.
- Today, Projects, Habits, and Analytics surfaces with completion logging.

[Unreleased]: https://github.com/baselhusam/daily-hub/compare/v0.1.12...HEAD
[0.1.12]: https://github.com/baselhusam/daily-hub/compare/v0.1.11...v0.1.12
[0.1.11]: https://github.com/baselhusam/daily-hub/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/baselhusam/daily-hub/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/baselhusam/daily-hub/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/baselhusam/daily-hub/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/baselhusam/daily-hub/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/baselhusam/daily-hub/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/baselhusam/daily-hub/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/baselhusam/daily-hub/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/baselhusam/daily-hub/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/baselhusam/daily-hub/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/baselhusam/daily-hub/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/baselhusam/daily-hub/releases/tag/v0.1.0
