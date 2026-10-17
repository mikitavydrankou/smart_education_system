# Source Learning Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task in this session.

**Goal:** Turn supplied material into a source-grounded adaptive lesson with preserved progress.

**Architecture:** Add a normalized source/course domain and deterministic progress reducer, a bounded server-only generation endpoint, and a client workspace using the existing theme and speech controls. Preserve the existing DNS example and API.

**Tech Stack:** Next.js, React, TypeScript, PDF.js, Mammoth, existing OpenRouter/OpenAI Responses transport.

**Spec:** `docs/superpowers/specs/2026-10-17-source-learning.md`

## Global Constraints
- Polish UI, existing Apple-inspired theme, server-only credentials.
- Input 120–20,000 characters, uploads at most 10 MB and PDFs at most 40 pages.
- Generate 3–5 concepts; each has exact source evidence and one distinct retry.
- No fabricated generic course on provider failure; local progress and explicit storage warnings.

## Review Focus
- Uploaded documents with no extractable text must request text/OCR rather than produce an empty lesson.
- Incorrect citations and invalid answer indexes must reject a generated course.
- Refresh during retry/results must preserve the canonical progress.
- Model failure and duplicate requests must preserve the draft and permit safe retry.
- Imported/generated strings must remain text, including malicious HTML-like source content.

### Task 1: Source/course model and progress
- [x] Add failing tests in `tests/material.test.ts` for normalization, evidence validation and bounded retry restoration.
- [x] Implement `lib/material.ts`: source/profile/course contracts, validators, reducer and restoration.
- [x] Run domain and existing unit suites; reject invalid evidence/index/state fixtures.

### Task 2: Generation boundary
- [x] Add tests for provider success, missing credentials, malformed/unsupported output and provider error.
- [x] Implement `lib/material-ai.ts` and `app/api/material/route.ts` with schema output, bounded text extraction, origin/body/concurrency/rate checks.
- [x] Verify accepted output uses source block IDs and exact quotations; missing provider returns actionable error.

### Task 3: Document import and workspace
- [x] Add browser fixtures/tests for input/preferences, imported text, outline, representations, retry, refresh and restart.
- [x] Add PDF.js and Mammoth; implement `lib/import-material.ts` local extraction and a client workspace with hydration-safe local persistence.
- [x] Wire `/workspace` and the home primary action; preserve `/lesson` as the example.
- [x] Run browser journeys against mocked generation and exercise one real OpenRouter generation separately.

### Task 4: Verification and handoff
- [x] Review changes and address actionable issues.
- [x] Run lint, TypeScript, unit tests, Webpack production build and Chromium desktop/mobile/iPhone/iPad suite.
- [x] Update README/HANDOFF/reuse document with actual scope and outstanding Safari/voice limitations.
- [x] Leave changes reviewable without committing credentials or adding AI coauthors.

## Execution record

- Implemented inline in the existing checkout to preserve the already authorized uncommitted design/API work. No commits or pushes were created.
- Domain/provider tests: 17 passed. Lint and TypeScript passed. Webpack production build passed; original Turbopack host limitation remains.
- Final browser suite: all 60 checks passed across desktop, Pixel, iPhone and iPad sizes in Chromium. WebKit remains blocked by the missing host library documented in HANDOFF.
- Real OpenRouter generation and an independent real browser journey through generated practice/retry/persisted results passed.
- Added real DOCX/PDF browser extraction fixtures and retained parser licenses.
- Review found no runtime/security defects; requested failed-retry persistence and denied-storage browser coverage was added.
- Ruling: retain the existing browser speech engine and accessible step visualization for this first slice; server TTS and arbitrary graph generation remain independent later work.
- Ruling: distinguish temporary quiz format from explicit preference, verified by a red/green unit regression and the browser journey. Earlier development-only snapshots were not shipped, so this initial v1 format does not need a migration.
