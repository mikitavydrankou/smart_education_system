# Two-phase course generation (text → media)

**Date:** 2026-10-17  
**Status:** implemented (cheap B: text-first, on-demand media, no repair, 3 concepts)

## Problem

Netlify synchronous functions stop around **30 seconds**. Current `/api/material` asks the model for a full Polish course **including** `mediaVersion: 2` (diagram + narration + activity) in one Responses call, with an optional quality **repair** attempt (up to 2 × 90s). Production logs show the first attempt often finishing quality-fail around ~25–30s, then the platform kills the function during repair. Clients then see timeouts / non-JSON bodies.

## Goal

Split generation so learners get a usable **text** lesson inside the Netlify budget, then enrich with **media** in a second request. Visual/audio/practice already fall back via `conceptMedia` → `legacyMedia` when `concept.media` is missing.

## Non-goals

- Background Netlify functions / queues
- Per-concept sequential API fan-out (approach C)
- Changing document `splitDocument` partitioning
- Changing speech `/api/speech` (still on-demand from narration text)

## Design

### Phase 1 — text course

- `POST /api/material` body unchanged: `{ text, profile }`
- Response: `{ course }` **without** `mediaVersion`, concepts **without** `media`
- Strict JSON schema: title, introduction, concepts (explanations, steps, evidence via `citationId`, question, retry only)
- Server validates with `validateCourse(resolved, source, false)`
- Text-only quality/repair (no media graph checks). Prefer **at most one** provider attempt under Netlify; keep a single bounded repair only for text structure if time allows
- Lower `max_output_tokens` vs full media generation (e.g. ~4000)

### Phase 2 — media enrich

- New `POST /api/material/media`
- Body: `{ text, course }` where `course` is a previously accepted text course for that source
- Response: `{ course }` with `mediaVersion: 2` and valid `media` on every concept
- Prompt/schema: generate only media fields keyed by existing concept ids; reuse concept evidence citation IDs (no new invented quotes)
- Validate with `validateCourse(..., true)`; one bounded media repair max
- Same origin/size/concurrency/rate-limit patterns as `/api/material`
- Failure must **not** remove the text lesson (client keeps phase-1 course)

### Client

1. Generate phase 1 → open workspace immediately (`requireMedia: false`)
2. Fire phase 2 in background; show status e.g. `Uzupełniam schematy i nagrania…`
3. On success, merge into workspace; on failure, keep text + existing legacy media notice
4. Prefer merging while `learning.stage === 'outline'` (before practice answers); if study already started, still merge media for concepts but rely on `conceptMedia` (document that mid-activity shape change is rare if enrich is prompt)

### Persistence

`saveLesson` currently digests `JSON.stringify({ source, course })`, so adding media changes the library id. Fix: digest **stable identity** — `source.text` + ordered concept `id`s (+ title), not full course JSON including media. Updating media then overwrites the same library row.

### Platform

- Document that Netlify ~30s applies to **each** phase separately
- Route `maxDuration` may stay high for other hosts; do not rely on it on Netlify
- Keep non-JSON response handling on the client

## Acceptance

- Short/medium source: phase 1 completes under ~30s on Netlify and opens a studyable lesson
- Phase 2 success upgrades diagram/narration/activity without regenerating explanations
- Phase 2 failure leaves phase-1 lesson intact
- Unit + browser tests cover text-only accept, media enrich, enrich failure, library id stability
- Example lesson `/lesson` unchanged

## Audit notes (project check)

| Finding | Implication |
|---------|-------------|
| `generationSchema` always requires media | Need separate text schema |
| `validateCourse(..., true)` in AI + client | Phase 1 must use `false` |
| `courseQualityIssues` assumes `c.media` | Split text vs media quality paths |
| `conceptMedia` / `legacyMedia` already work | Phase-1 UX is viable today |
| `restoreWorkspace` already allows no media | Persistence OK for text courses |
| Library digest includes full course | Must stabilize id before enrich saves |
