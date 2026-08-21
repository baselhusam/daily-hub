# DailyHub — Product Film Script

**Format:** 16:9 advertising film, ~40 seconds, 30fps  
**Tone:** Quiet, editorial, paper and ink. Not a loud SaaS ad.  
**Product line:** *A quiet workspace that keeps the day in one place.*

---

## What this product is

DailyHub is a **personal command center** for people who juggle more than one project at once — founders, consultants, indie builders. Client work, side projects, inbox leftovers, and daily habits live in one morning surface.

It is **not** Jira, Linear, or Notion. It is the place you open to see:

1. What is open
2. What belongs where
3. What must happen today
4. What you already finished

**Surfaces to show:** Today, Projects, Habits, Analytics.  
**Audience:** single-user, self-hosted, people who want clarity without enterprise PM software.

---

## Visual system (must follow)

Treat this like a paper workspace, not a neon dashboard.

| Token | Hex | Use |
|---|---|---|
| Ink | `#37352F` | Text, mark, dark UI chrome |
| Signal blue | `#2383E2` | Today, streaks, links, primary CTA, “Hub” in the wordmark |
| Paper | `#F7F7F5` | Backgrounds, sidebar, wells |
| Canvas | `#FFFFFF` | Cards, sheets |
| Muted | `#787774` | Secondary copy |
| Faint | `#9B9A97` | Labels, counts |
| Rule | `#E9E9E7` | Hairline dividers |
| Done green | `#0F9960` | Completed checkboxes only |
| Overdue | `#D44C47` | Late items only |
| Warn | `#D9730D` | Stalled / nudges |

**Type:** Instrument Sans (400 / 500 / 600). Tracking tight on headlines (−1.5% to −2.5%). Eyebrow labels 11.5px, +2% tracking, faint, uppercase. Metrics in tabular numerals.

**Logo:** Ink rounded square with a white checkmark and a **signal-blue day-dot** at the top-right of the mark. Wordmark is Daily**Hub** — “Daily” in ink, “Hub” in signal blue. Do not gradient, shadow, stretch, or recolor the check.

**Motion language:** Fast and small. Checkboxes snap in under 160ms. Cards rise 6px and fade in 220ms. No bounce. No purple. No gradients. No nested cards. Green means done. Blue is for “today,” not for checks.

**Sample content to put on screen** (use these, do not invent generic “Task 1 / Project A”):

- Greeting: `Good morning.`
- Date eyebrow: `Wednesday 19 Aug`
- Projects: DailyHub · Client Delivery · Medium Series · Personal Site
- Habits: Publish Medium post · Check inbox · Plan tomorrow · Deep work block
- Tasks: Polish dashboard layout · Reply to client proposal email · Draft outline for next Medium post · Send invoice follow-up (inbox, overdue)
- Snapshot metrics: open tasks, habits today, streak, completions

---

## Voiceover

Calm, close-mic, unhurried. One speaker. Slightly low, never hype. Pauses are part of the film.

```
Your work is already happening.
It just lives in too many places.

Notes. Tabs. Habits mixed with client work.
No simple picture of today.

DailyHub is the morning surface.
Projects, inbox, and the few things that must happen every day — in one quiet workspace.

Check something off. It is done for today.
See the chain hold. See the week take shape.

Not another tool to manage.
A place to see the day.

DailyHub.
A quiet workspace that keeps the day in one place.
```

**On-screen end card** (no VO overlap after the last line):

```
DailyHub
A quiet workspace that keeps the day in one place.
Self-hosted  ·  Single-user  ·  Yours
```

---

## Shot list

**Total: 40 seconds.** Hard cuts are allowed; prefer 12–18 frame paper-slide or opacity fades. Camera: slow, editorial, like turning a page.

### 0:00–0:04 — Scatter

**VO:** Your work is already happening. It just lives in too many places.

Paper canvas. Loose fragments drift in from the edges: a sticky “Reply to client,” a calendar block, a Medium draft, an invoice. They never quite align. Hairline rules, no drop shadows. Ink type only. A faint grid like the product banner.

**On screen:** nothing branded yet.

### 0:04–0:08 — The problem, named

**VO:** Notes. Tabs. Habits mixed with client work. No simple picture of today.

Fragments stack, slightly overlapping, then freeze. One overdue chip in `#D44C47`: `Send invoice follow-up`. One unlabeled habit sitting next to a client task. The frame feels busy, then still.

**On screen (eyebrow, faint):** `TOO MANY PLACES`

### 0:08–0:12 — The mark

**VO:** DailyHub is the morning surface.

Everything recedes. The brand mark draws itself: rounded ink square, white check, then the signal-blue day-dot lands in the corner like a period. Wordmark fades in beside it: Daily**Hub**.

Hold. Plenty of paper around it.

### 0:12–0:20 — Today

**VO:** Projects, inbox, and the few things that must happen every day — in one quiet workspace.

The Today page assembles: paper sidebar on the left (Today, Projects, Habits, Analytics), white canvas on the right.

Show, in order:

1. Date eyebrow + `Good morning.`
2. Snapshot cards with small ink numerals
3. Habits card — Publish Medium post, Check inbox, Plan tomorrow — progress bar filling in signal blue
4. Open work grouped under **Client Delivery** and **DailyHub**
5. Inbox card on paper for ungrouped tasks

Camera: start wide on the shell, then a gentle push into the habits card. UI should look like the real app, not a cartoon of an app.

**On screen (lower third, optional, 1.2s):** `TODAY`

### 0:20–0:26 — The check

**VO:** Check something off. It is done for today.

Zoom to a single row: **Publish Medium post**. Empty checkbox `#C7C6C2`. Cursor/focus ring in signal blue. Check snaps to done green `#0F9960` in under 160ms. A soft done overlay on the row. The habits progress bar ticks 2/4 → 3/4.

No celebration confetti. No bounce. The satisfaction is the snap.

Then a 14-day chain of dots fills one more day in signal blue.

**On screen:** `DONE FOR TODAY`

### 0:26–0:32 — Projects, then the week

**VO:** See the chain hold. See the week take shape.

Quick, clean sequence (about 2s each):

1. **Projects** — four cards with progress bars: DailyHub, Client Delivery, Medium Series, Personal Site. One stalled banner in warn orange if you need tension, keep it small.
2. **Habits** — weekday pills (M T W T F) and consistency dots.
3. **Analytics** — 14-day activity bars in ink/signal, project breakdown, habit rates. Charts as simple CSS bars, not 3D.

Transitions: 300ms opacity, 6px rise. Never wipe with gradients.

### 0:32–0:40 — Close

**VO:** Not another tool to manage. A place to see the day. DailyHub. A quiet workspace that keeps the day in one place.

UI recedes into paper. Lockup centers. Tagline under it in muted ink. Three faint pills: `Self-hosted` · `Single-user` · `Yours`.

Hold 1.5s of silence after the last word. End on the mark + wordmark. No URL unless you add one later. No “Get started free” energy.

Fade to paper, not black.

---

## How it should feel

Imagine a well-made stationery commercial, not a Y Combinator launch video.

- Quiet confidence. Space around every element.
- One accent color. If the frame is already using signal blue, do not add another.
- Checking a box is the hero moment. Everything else supports that.
- Light theme is primary. A 1-second dark-theme flash is optional at 0:30, then return to paper for the end card.
- Sound: soft paper rustle / a single low tick when the checkbox completes / almost no music. If music exists, it should be a sparse piano or analog pulse, never stock “inspiring corporate.”

---

## Do not

- Purple, neon, glassmorphism, mesh gradients, floating 3D phones
- “10x your productivity,” streaks-as-guilt, coaching copy, broken-chain drama
- Fake team avatars, @mentions, kanban columns, Gantt charts
- Blue filled checkboxes (checks turn **green** when done)
- Nested cards, giant accent fills, bounce easings, emoji rain
- Inter / Roboto / generic rounded “startup” UI
- Replacing DailyHub with a made-up name or slogan

---

## Deliverable

One 1920×1080 H.264, ~40s, with burned-in type (Instrument Sans). Optional 1080×1080 center-crop for social, same edit, slightly larger type. Captions on, matching the VO verbatim.

If the agent can use product screenshots, prefer real DailyHub UI over invented mockups. Brand assets: ink checkbox mark + Daily**Hub** lockup. Primary line to protect: **A quiet workspace that keeps the day in one place.**
