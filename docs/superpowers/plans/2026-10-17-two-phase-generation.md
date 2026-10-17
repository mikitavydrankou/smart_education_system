# Two-phase Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a text-only course in `/api/material`, then enrich media via `/api/material/media`, so Netlify’s ~30s limit no longer blocks lesson creation.

**Architecture:** Split the strict Responses schema and `material-ai` into text vs media generators. Client opens the workspace after phase 1 and merges phase 2 when ready. Library IDs hash stable course identity (source + concept ids), not media payload.

**Tech Stack:** Next.js App Router, TypeScript, OpenAI/OpenRouter Responses API, Playwright, node:test.

**Spec:** `docs/superpowers/specs/2026-10-17-two-phase-generation.md`

## Global Constraints

- Polish UI copy only for user-facing strings.
- Never invent source quotes; media must reuse concept evidence / citation IDs.
- Phase-2 failure must leave the phase-1 lesson usable (`conceptMedia` → `legacyMedia`).
- Do not break `/lesson` example or speech `/api/speech`.
- Each Netlify function invocation must finish its own phase; no repair loop that assumes 90s×2 on Netlify.

## File map

| File | Responsibility |
|------|----------------|
| `lib/course-schema.ts` | `textGenerationSchema`, `mediaGenerationSchema` (+ keep full schema helpers if needed) |
| `lib/course-quality.ts` | `textCourseQualityIssues`, `mediaCourseQualityIssues` (or mode flag) |
| `lib/material-ai.ts` | `generateMaterial` (text), `generateCourseMedia` (enrich) |
| `lib/device-storage.ts` | Stable `saveLesson` digest |
| `app/api/material/route.ts` | Phase 1 only |
| `app/api/material/media/route.ts` | **New** phase 2 |
| `components/material-workspace.tsx` | Two-step client flow + status |
| `tests/*` | Unit + browser coverage below |

---

### Task 1: Text schema + text quality + text generator

**Files:**
- Modify: `lib/course-schema.ts`
- Modify: `lib/course-quality.ts`
- Modify: `lib/material-ai.ts`
- Modify: `tests/material-ai.test.ts`
- Modify: `tests/course-quality.test.ts` (if text path needs fixtures)

**Interfaces:**
- Produces: `textGenerationSchema(source?: Source)`, `textCourseQualityIssues(raw, source)`, `generateMaterial(...)` returns `Course` **without** `mediaVersion`
- Consumes: existing `resolveCitations`, `validateCourse(course, source, false)`, `resolveAiProvider`

- [ ] **Step 1: Failing tests for text-only generation**

In `tests/material-ai.test.ts`, add/adjust so the mocked Responses body is a **text** course (no `mediaVersion`, no `media`), and assert:

```ts
const course = await generateMaterial(source, defaultProfile)
assert.equal(course.concepts.length, 3)
assert.equal(course.mediaVersion, undefined)
assert.ok(course.concepts.every(c => !c.media))
```

Mock fetch must see schema/prompt that does **not** require media fields (assert `JSON.parse(body).text.format.schema.required` excludes `mediaVersion` or properties lack concept `media` — pick one stable assertion).

Also assert a quality-fail text course triggers at most one repair that still targets text issues (existing repair test adapted).

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm test -- tests/material-ai.test.ts`  
Expected: FAIL on text-only / mediaVersion assertions (current code still forces media).

- [ ] **Step 3: Implement text schema**

In `lib/course-schema.ts`, add a text-only builder (keep existing full/canonical for media validation as needed):

```ts
const textCourse = (evidence: unknown, minConcepts = 3) =>
  object({
    title: str(3, 120),
    introduction: str(10, 600),
    concepts: array(object({ ...fields, evidence: array(evidence, 1, 3) }), minConcepts, 5),
  })

export function textGenerationSchema(source?: Source) {
  const citationId = source
    ? { type: 'string', enum: sourceCitations(source).map(c => c.id) }
    : { type: 'string' }
  return textCourse(object({ citationId }), 0)
}
```

Keep `generationSchema` for media enrich or replace its role; do not leave phase-1 pointing at media-required schema.

- [ ] **Step 4: Text quality path**

In `lib/course-quality.ts`, export `textCourseQualityIssues` that:
1. Runs `resolveCitations`
2. Shapes against **text** schema (no media properties)
3. Checks evidence verbatim, distinct question options, distinct retry prompts, unique concept ids
4. Ends with `validateCourse(resolved, source, false)`

Do not read `c.media` in this path.

- [ ] **Step 5: Rewrite `generateMaterial` for text**

In `lib/material-ai.ts`:
- Use `textGenerationSchema(source)`
- Prompt: Polish course rules **without** mediaVersion/media paragraphs; keep evidence citation rules
- `max_output_tokens`: ~4000
- Accept with `validateCourse(resolveCitations(...), source, false)`
- Repair via `textCourseQualityIssues` only; max 2 attempts (same as today) unless you add a tighter Netlify note in comments
- Log provider errors as already done

- [ ] **Step 6: Tests pass**

Run: `pnpm test -- tests/material-ai.test.ts tests/course-quality.test.ts tests/source-citations.test.ts`  
Expected: PASS (update fixtures/mocks that still feed rich courses into `generateMaterial`).

- [ ] **Step 7: Commit**

```bash
git add lib/course-schema.ts lib/course-quality.ts lib/material-ai.ts tests/material-ai.test.ts tests/course-quality.test.ts
git commit -m "$(cat <<'EOF'
feat: generate text-only courses in phase one

Keep media out of the first provider call so Netlify can finish under ~30s.
EOF
)"
```

---

### Task 2: Media enrich generator + API route

**Files:**
- Modify: `lib/course-schema.ts`, `lib/course-quality.ts`, `lib/material-ai.ts`
- Create: `app/api/material/media/route.ts`
- Test: `tests/material-ai.test.ts` (media enrich cases)

**Interfaces:**
- Produces: `generateCourseMedia(source, course, signal?) => Promise<Course>` with `mediaVersion: 2`
- Produces: `POST /api/material/media` → `{ course }` or `{ error }`
- Consumes: text `Course` already validated for `source`; `mediaSchemaFor({ citationId })`

- [ ] **Step 1: Failing tests for media enrich**

```ts
test('media enrich attaches mediaVersion 2 without changing concept ids', async () => {
  // mock fetch returning media payload for each concept id
  const textCourse = /* validated text course from fixture without media */
  const rich = await generateCourseMedia(source, textCourse)
  assert.equal(rich.mediaVersion, 2)
  assert.deepEqual(rich.concepts.map(c => c.id), textCourse.concepts.map(c => c.id))
  assert.ok(rich.concepts.every(c => c.media))
})
```

Also: missing key → actionable error; provider 503 → GenerationError; id mismatch / inventing concepts → reject.

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test -- tests/material-ai.test.ts`  
Expected: FAIL (`generateCourseMedia` missing).

- [ ] **Step 3: Media schema + quality**

Add `mediaGenerationSchema(source, course)` that asks the model for:

```ts
// shape example — exact builder in course-schema.ts
{
  mediaVersion: 2,
  concepts: [{ id: enum(existingIds), media: mediaSchemaFor({ citationId: enum(ids from that concept's evidence citations) }) }]
}
```

Prefer constraining each concept’s citation enum to the citations already selected for that concept after resolving evidence (safer than full source list).

`mediaCourseQualityIssues`: diagram connectivity, activity solutions, citation indexes; final `validateCourse(..., true)`.

- [ ] **Step 4: `generateCourseMedia`**

- Re-validate input course with `validateCourse(course, source, false)`; if null → `GenerationError` 400
- Prompt: only generate media; keep concept ids; citationIds must be from provided per-concept allow-list; do not rewrite explanations
- Merge model media onto the **server-trusted** text course fields (ignore model title/explanation if returned)
- `max_output_tokens`: ~6000, timeout 90s, ≤2 attempts with media repair
- Return full rich `Course`

- [ ] **Step 5: API route**

Create `app/api/material/media/route.ts` mirroring `app/api/material/route.ts` guards:
- `runtime = 'nodejs'`, `maxDuration = 60` (document Netlify still ~30s)
- Origin / JSON / body ≤100KB / concurrency+rate limits (shared or copy pattern)
- Parse `{ text, course }`, `normalizeSource(text)`, `validateCourse(course, source, false)`
- `generateCourseMedia(source, course, request.signal)`
- Same `GenerationError` JSON mapping

- [ ] **Step 6: Tests pass + typecheck**

Run: `pnpm test -- tests/material-ai.test.ts && pnpm typecheck`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/course-schema.ts lib/course-quality.ts lib/material-ai.ts app/api/material/media/route.ts tests/material-ai.test.ts
git commit -m "$(cat <<'EOF'
feat: add media enrich API for phase-two generation

Attach diagrams, narration, and activities after the text lesson exists.
EOF
)"
```

---

### Task 3: Stable library id + workspace client flow

**Files:**
- Modify: `lib/device-storage.ts`
- Modify: `components/material-workspace.tsx`
- Test: `tests/material.test.ts` or new `tests/device-storage.test.ts` if present; browser `tests/browser/workspace.spec.ts`, `tests/browser/multimodal.spec.ts`

**Interfaces:**
- `saveLesson` id = digest of stable identity, not full media-bearing course JSON
- Workspace: phase1 open → background phase2 merge

- [ ] **Step 1: Failing persistence test**

```ts
test('saveLesson keeps the same id when only media is added', async () => {
  const text = { ...workspace, course: textCourse }
  const rich = { ...workspace, course: richCourse }
  const a = await saveLesson(text)
  const b = await saveLesson(rich)
  assert.equal(b[0].id, a.find(x => x.title === text.course.title)?.id ?? b[0].id)
  // stronger: compute expected shared id from source+concept ids
})
```

Adapt to actual `saveLesson` return shape (`SavedLesson[]`).

- [ ] **Step 2: Fix digest**

In `lib/device-storage.ts`:

```ts
const id = await digest(JSON.stringify({
  source: workspace.source.text,
  concepts: workspace.course.concepts.map(c => c.id),
  title: workspace.course.title,
}))
```

(Exact fields: source text + concept ids + title is enough; do not include media.)

- [ ] **Step 3: Client two-phase flow**

In `components/material-workspace.tsx` `generate`:
1. `POST /api/material` → `validateCourse(body.course, source, false)` → `setWorkspace(...)`
2. Set status e.g. `mediaStatus: 'loading' | 'ready' | 'failed'` (local React state is enough)
3. `POST /api/material/media` with `{ text: source.text, course }` (no `requireMedia` on input)
4. On OK: `validateCourse(..., true)` → update workspace course; status ready
5. On fail: status failed; keep text lesson; optional Polish notice

Safe JSON parse already present — reuse for both calls. Client timeout for phase 1 can drop toward ~45–60s; phase 2 similar.

Polish strings:
- loading: `Uzupełniam schematy i nagrania…`
- failed: `Lekcja tekstowa jest gotowa. Nie udało się dodać schematów — możesz uczyć się dalej.`

- [ ] **Step 4: Browser tests**

Update mocks:
- `workspace.spec.ts`: fulfill `/api/material` with **text** `courseFixture`; optionally fulfill `/api/material/media` with `richCourseFixture`
- `multimodal.spec.ts`: assert legacy/formats work after text-only fulfill; with media route, diagram/activity use rich media
- `offline.spec.ts` / `document-parts.spec.ts`: same dual-route pattern if they open generated lessons

- [ ] **Step 5: Run verification**

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm test:e2e -- tests/browser/workspace.spec.ts tests/browser/multimodal.spec.ts
```

Expected: all PASS

- [ ] **Step 6: Docs**

Update `docs/HANDOFF.md` and briefly `README.md`: two-phase generation, Netlify ~30s per phase, env keys unchanged.

- [ ] **Step 7: Commit**

```bash
git add lib/device-storage.ts components/material-workspace.tsx tests docs/HANDOFF.md README.md
git commit -m "$(cat <<'EOF'
feat: open text lessons then enrich media in the workspace

Stabilize library ids so media upgrades overwrite the same saved lesson.
EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Phase 1 text-only API | Task 1 + existing route |
| Phase 2 media API | Task 2 |
| Client open then enrich | Task 3 |
| Phase-2 failure keeps text | Task 3 |
| Stable library id | Task 3 |
| Tests unit + browser | Tasks 1–3 |
| `/lesson` unchanged | No task touches it |
| Citation integrity | Tasks 1–2 schemas |

**Placeholder scan:** none intentional.  
**Type consistency:** `generateMaterial` → text `Course`; `generateCourseMedia(source, course)` → rich `Course`; client uses `validateCourse(..., false|true)` accordingly.

## Verification checklist (human / Netlify)

- [ ] Deploy with only `OPENAI_API_KEY`
- [ ] Generate from a short educational excerpt — lesson opens &lt; ~30s
- [ ] Confirm media status completes or soft-fails without wiping the lesson
- [ ] Heavy arXiv excerpt: phase 1 may still be tight; if needed, later reduce concepts for `minutes: 5` only (out of scope unless still failing)
