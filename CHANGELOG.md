# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/baselhusam/daily-hub/compare/v0.1.6...HEAD
[0.1.6]: https://github.com/baselhusam/daily-hub/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/baselhusam/daily-hub/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/baselhusam/daily-hub/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/baselhusam/daily-hub/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/baselhusam/daily-hub/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/baselhusam/daily-hub/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/baselhusam/daily-hub/releases/tag/v0.1.0
