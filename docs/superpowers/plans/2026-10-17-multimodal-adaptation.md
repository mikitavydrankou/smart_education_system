# Multimodal Adaptation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline.

**Goal:** Adapt teaching presentation using preferences and observed performance, with substantive visual/audio/action representations.

**Architecture:** Extend the validated course media schema, introduce a version-2 adaptive reducer with verified v1 migration, and render specialized media components inside the existing workspace. Add a server-only speech boundary alongside existing generation.

**Tech Stack:** TypeScript, React, SVG, native HTML audio, OpenRouter speech/Responses APIs, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-17-multimodal-adaptation.md`

## Global Constraints
- Polish UI and current design; existing lessons/progress must survive migration.
- Generated graphs/activities are structured data, never executable HTML/code.
- User controls presentation and can disable adaptive suggestions.
- Activity scores and common knowledge checks remain distinct; duplicate checks do not inflate evidence.

## Review Focus
- Dangling graph edges or ambiguous activity solutions must reject output.
- Quiz navigation must not misattribute teaching outcomes to the quiz tab.
- Restoring a v1 lesson must preserve its exact completed answers and stage.
- Missing audio provider or malformed media response must leave a usable transcript/fallback.
- Touch/keyboard learners must complete the same activities without drag-only controls.

### Tasks
- [x] Domain: failing tests, rich-media validators/legacy derivation and deterministic activity grading.
- [x] Adaptation: failing attribution/migration tests, v2 replay and transparent policy/override controls.
- [x] Generation/audio: extend constrained generation and add tested bounded speech API.
- [x] UI: actual node/edge diagrams, three activity renderers and an audio lesson player; integrate recommendation/history.
- [x] Verification: browser interaction/refresh/media regressions, real provider checks, review, all unit/lint/type/build/browser checks, documentation and live preview.
