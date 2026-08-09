# Project — DailyHub

## Purpose

DailyHub is a personal command center for people who work across **multiple businesses and projects** at the same time — founders, consultants, indie builders, and anyone juggling client work, side projects, and daily habits in one place.

The goal is not project-management complexity. It is **clarity at a glance**: what is open, what belongs where, what must happen today, and what you already finished.

## Problem it solves

Without a dedicated hub, work fragments across:

- Notes and todos with no business/project context
- Recurring habits (e.g. publish a Medium post) mixed with one-off tasks
- No simple log of what was actually completed over time

DailyHub unifies:

1. **Businesses** (e.g. consulting, content studio) with optional logos
2. **Projects** under each business
3. **Tasks** tied to a business, project, or nothing (inbox)
4. **Daily tasks** — recurring checklist items with icons
5. **Completion history** — automatic logging when work is done

## Target user (v1)

- **Single user**, self-hosted
- Uses the app **daily** as a lightweight morning/evening review surface
- Wants a **simple, attractive** interface — not enterprise PM software

## Core pages

| Route | Role |
|-------|------|
| `/` | **Dashboard** — businesses, projects, inbox, daily checklist, recent completions |
| `/analytics` | **Analytics** — charts and stats for tasks, businesses, projects, daily habits |

Navigation: left sidebar (desktop) or top tabs (mobile).

## Success criteria

- Open the app and immediately see what to do today
- Create a business, project, or task in seconds via dialogs
- Check off daily habits and tasks; completions appear in the feed and analytics
- Run the full stack locally with one Docker Compose command on port 9999
- Light and dark themes for comfortable daily use

## Origin

Built as a greenfield Next.js app in the `daily-hub` repository, designed in conversation around a minimal one-page dashboard with optional analytics and Dockerized PostgreSQL — no separate Python/FastAPI backend.
