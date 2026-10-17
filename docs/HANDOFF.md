# ADAPT maintenance handoff

## Product requirements

University prototype for the course “Systemy Multimedialne Uczące”. Complete the existing application rather than rebuilding it. All user-facing text must be natural Polish; code and developer documentation remain English. The initial mint/teal design constraint was superseded by the user's 2026-10-17 request for an Apple-inspired redesign. The subsequent “design and implement” request authorized the source-to-course workflow, now available at `/workspace`. The DNS/IP course remains an independent example at `/lesson`. No accounts or cloud database have been added.

Required flow: welcome → three-question initial assessment (DNS/IP/server and browser) → adapted lesson → interactive network diagram → one practice question at a time → immediate feedback and Smart Retry → factual final summary. Correctness is deterministic TypeScript, never AI grading.

## Implemented

- Next.js 16.4 App Router, React 19, TypeScript, Tailwind 4, existing lucide icons/UI styling retained.
- `lib/lesson-data.ts`: typed Polish concept explanations, simpler versions, examples, steps, assessment and five practice questions with genuinely different retries. DNS cache, IP and browser/server distinctions covered.
- `lib/session.ts`: typed deterministic reducer; assessment answers, knowledge gaps, active/viewed concepts, selections, individual practice attempts and feedback/retry phases. Versioned restoration validates snapshots by replaying valid events. No untrusted stored scores. Duplicate assessment/practice submissions are guarded.
- `components/use-session.ts`: hydration-safe localStorage initialization and persistence; storage failures shown to users.
- `components/adapt-app.tsx`: original shell/cards retained, all stages connected. Assessment changes concise/expanded lesson text. Practice freezes submitted answers. Exactly one retry per question. Final concept aggregation retains review if any task is unresolved. Restart supported.
- `components/lesson-media.tsx`: clickable browser → DNS → IP → server → response diagram; Polish speech synthesis with stop, cleanup and missing-voice feedback.
- `components/mistake-explanation.tsx`, `lib/explanation.ts`, `lib/ai-explanation.ts`, `app/api/explain/route.ts`: optional mistake explanations; browser submits only known question ID, retry flag, wrong answer index and allowed style. Server resolves verified content. OpenAI Responses API, 10-second timeout, 350 output tokens, `store: false`, bounded text extraction. Missing credentials/errors use honest lesson fallback. Request validation, same-origin check, bounded process-local deduplication/cache; UI request cancellation and duplicate prevention. Rendered as text.
- `app/layout.tsx`: Polish metadata/language, system light/dark appearance and safe-area viewport handling. Removed `ignoreBuildErrors` from Next config. Unknown routes produce 404; `/lesson` and `/results` show current persisted stage.
- `.env.example`, `.gitignore`, lint/type/test scripts, ESLint config, deterministic tests and Playwright journeys added.

## Verification at handoff

Executed successfully:
- `pnpm test`: 10 deterministic tests, including duplicate assessment regression, retry restoration/limit, result aggregation, corrupted storage, bank invariants, missing key and mocked provider success/failure.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: production build passed; sandbox needed permission to open a local Turbopack port.

## Maintenance verification (2026-10-17, Linux)

- All 11 deterministic tests passed with `node --test --test-isolation=none tests/*.test.ts`, including OpenRouter transport/model selection. The default isolated runner on this host reports only two file-level results; the non-isolated run exposes each individual test.
- ESLint and TypeScript passed. Production build passed with `npm run build -- --webpack`. Default Turbopack failed because its CSS worker could not bind a local port (`Operation not permitted`), including a retry with expanded permissions. This is an environment limitation; the default build script is unchanged.
- All 16 Playwright tests passed against the production build: desktop Chrome and Pixel 7 emulation. Coverage includes full lesson, concise/expanded adaptation, diagram, successful/unsuccessful bounded retry, persisted selections/retry feedback/results, restart, keyboard selection/focus, malformed storage, denied writes, invalid/cross-origin/oversized API requests, and local fallback in all three styles when the explanation request fails.
- Visually inspected desktop and mobile lesson screenshots. No horizontal overflow observed; existing mint/teal cards and Polish interface retained. Mobile testing uses emulation, not a physical device.
- Added speech API boundary tests for Polish language/voice/text, stop, text changes, late voice availability, and unsupported speech. Fixed stale completion/error callbacks affecting a newer utterance and stale missing-voice feedback after a voice becomes available.
- Playwright now owns a fresh production server with both provider keys explicitly empty, so fallback assertions cannot accidentally make paid requests or reuse an unrelated server.
- Added optional OpenRouter support using `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` (default `openai/gpt-4.1-mini`), taking precedence over direct OpenAI when configured. Real OpenRouter service and local API requests returned Polish explanations with `source: ai`. After the origin fix, a real browser journey displayed the provider's Polish explanation under “Wyjaśnienie AI”.
- Fixed legitimate browser AI requests returning 403 when Next's internal request URL hostname differs from the public Host. Origin validation now uses the request's actual Host, without trusting arbitrary forwarded hosts. Added a real browser fetch regression alongside the cross-origin rejection assertion.
- This host has pnpm 11.22.0. Dependencies were installed from the frozen lockfile, but pnpm reports an unapproved `unrs-resolver` install script and blocks subsequent script commands. The equivalent package scripts were run through npm, without changing the lockfile. For this host use `npm test`, `npm run lint`, `npm run typecheck`, `npm run build -- --webpack`, and `npm run test:e2e` after installation.

Still not verified:
- Direct OpenAI transport remains mocked. Real OpenRouter transport has been verified with the supplied key; do not expose or commit credentials.
- Audible speech and a real Polish system voice: Chromium on this host returned an empty voice list. Speech lifecycle behavior is tested using an emulated system API, not audible output.

## Apple-inspired redesign verification (2026-10-17)

- Replaced the home layout and updated all existing learning stages with a system-font, neutral/blue design. Added functional text/diagram/audio previews, automatic light/dark appearance, safe-area viewport handling and reduced-motion/transparency accommodations. User-facing text remains Polish.
- All 40 Chromium Playwright checks passed: desktop, Pixel 7, iPhone 13 and iPad Pro 11 emulation. This includes the full learning flow and new preview/appearance/compact-layout/primary-text-contrast checks. Primary blue actions were darkened after a regression test exposed insufficient white-text contrast in dark mode.
- All 11 deterministic tests, ESLint (no warnings), TypeScript and production build via `npm run build -- --webpack` passed. The existing Turbopack environment limitation remains.
- Visually inspected desktop/iPhone/iPad home and lesson screenshots, including dark mode. Responsive emulation is not a physical-device test.
- WebKit was installed but its test launch failed because the host lacks `libmanette-0.2-0`. Installing that dependency requires interactive sudo authentication, which was unavailable. `npm run test:e2e:apple` is ready for a suitable host; Safari/WebKit is not yet verified.
- Research and a phased source-to-lesson architecture are recorded in `docs/ADAPT-NEXT.md`. Candidate libraries are not installed and document/course generation is not implemented by this visual update.

## Recommended next steps

1. Read the code and this handoff, inspect git status, run existing checks.
2. Re-run browser journeys after future changes; desktop/mobile journeys and API fallback now pass on Linux.
3. Verify audible speech on a device with a real Polish voice. Available/unavailable/late voices and unsupported browsers are covered by automated API boundary tests.
4. Current viewed-concept tracking records explicit tab visits; the initial displayed topic is not automatically marked viewed. This optional refinement was left unchanged to preserve existing session semantics.
5. In-memory cache is instance-local, not a distributed rate limit; this is a university prototype. Do not expand into infrastructure work unless deployment requires it. Verify direct OpenAI only if that provider is needed; OpenRouter has been exercised live.
6. Polish any remaining issues, rerun tests/typecheck/lint/build and report exact results, limitations and run commands. Keep documentation in English and UI Polish.

## Source-to-course implementation (2026-10-17)

- `/workspace` accepts pasted text and TXT/Markdown/DOCX/PDF uploads. Mammoth 1.13.0 extracts DOCX raw text; PDF.js 6.4.299 extracts PDF text through its bundled worker. Parsing is client-side; only generation sends extracted text/preferences to the server. Limits are 120–20,000 characters, 10 MB/file and 40 PDF pages. Scans need external OCR. Text extraction does not retain original page coordinates and may need cleanup for complex layouts.
- `lib/material.ts` defines normalized source blocks, preferences, course/question/evidence validators and replayable progress. Accepted courses contain 3–5 concepts with exact source quotations and bounded question/retry structures. Exact quotations do not prove every AI explanation is factually grounded; source review remains available to the learner.
- `lib/material-ai.ts` requests schema-constrained Polish course JSON through OpenRouter/direct OpenAI, with provider timeout and validation. Missing credentials/provider errors return an actionable error and preserve the user's draft; no generic lesson is substituted.
- `app/api/material/route.ts` checks origin, content type, streamed request size, normalized input/profile, two concurrent generations and a process-local limit of 10 generation attempts/minute. These are prototype process-local bounds, not authenticated/distributed quotas.
- `components/material-workspace.tsx` implements input/preferences, selected outline, text/simple/example, selectable visual steps, speech/transcript, deterministic quiz with one retry and per-topic results. Format preference is distinct from temporary quiz entry and is restored on the next topic. `use-workspace.ts` stores the draft and a validated course/replay snapshot in localStorage, with visible storage-failure feedback.
- Source, draft and course are local to this browser, not synced across devices. A single accepted course is retained; replacing it asks the user to confirm. Arbitrary diagrams, OCR, server TTS, spaced repetition, accounts and multi-course libraries remain future stages.
- Real OpenRouter generation produced a valid three-concept photosynthesis course. A separate real browser run generated another course, completed practice plus retry and restored the final results after refresh. No credentials were logged or committed.
- Runtime parser license notices are retained in `docs/THIRD-PARTY-NOTICES.md` and `docs/licenses/`.
- Final verification: 17 unit tests passed; ESLint and TypeScript passed; `npm run build -- --webpack` passed; all 60 Chromium browser checks passed across desktop, Pixel 7, iPhone 13 and iPad Pro 11 emulation. New checks cover local text/DOCX/PDF import, source-preserving provider failure, selected outline restoration, representations, return to preferred format, successful/unsuccessful bounded retry, persisted results and denied storage. Safari/WebKit and audible Polish speech retain the earlier host limitations.

## Local commands

Use Node.js 24 LTS (Node's built-in TypeScript stripping runs the unit tests) and pnpm 12.3.4, declared in package.json.

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. `OPENAI_API_KEY` is optional; `OPENAI_MODEL` defaults to `gpt-4.1-mini`. Never commit `.env.local` or expose the key with a `NEXT_PUBLIC_` prefix.

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright starts its own production server on 127.0.0.1:3100 with an empty API key, so build first and leave that port free. For production use `pnpm build` followed by `pnpm start`.

## Multimodal learning and automatic profile (2026-10-17)

This section supersedes the earlier visual-step-only, system-speech-only and fixed-preference limitations for `/workspace`.

- New courses require mediaVersion 2: validated source-linked graph nodes/relations, Polish narration, and deterministic ordering/matching/classification tasks. Existing snapshots migrate through strict replay and retain progress; their limited media are derived from saved content.
- `/api/speech` generates bounded MP3 audio server-side using the existing provider key, with origin/body/concurrency/rate bounds. OpenRouter defaults to `microsoft/mai-voice-2.1-flash` with an explicit Polish voice. `OPENROUTER_TTS_MODEL`, `OPENAI_TTS_MODEL` and `TTS_VOICE` are optional overrides. Transcript/system speech remains available on failure.
- `lib/adaptive.ts` separates interactive activity from knowledge assessment, records first-attempt outcomes, explores formats and offers provisional recommendations with sparse-data messaging and manual override. A separate local learner history survives course replacement/restart. No fixed VAK diagnosis is claimed. Research, algorithm thresholds and limitations: `docs/LEARNER-PROFILE-RESEARCH.md`.
- Live OpenRouter generated a validated rich photosynthesis course with matching, ordering and classification. Live Polish server narration returned 230400 MP3 bytes. Subjective/audible voice quality and Safari remain device checks.

- Final multimodal verification: 24 unit tests, ESLint without warnings, TypeScript and production webpack build passed. All 72 Chromium browser checks passed across desktop, Pixel 7, iPhone 13 and iPad Pro 11 emulation. Review fixes preserve the teaching format when entering a quiz/retry and count actual system-speech start as audio exposure. Live-provider MP3 decoded and advanced playback on desktop/iPhone Chromium; screenshots showed no document overflow. Safari and audible physical-device quality remain unverified. The current production preview runs at http://127.0.0.1:3200/workspace.

## Long scientific PDF fix (2026-10-17)

- Reproduced the user report with a 34-page PDF: PDF.js extracted 108,326 characters, exceeding the former 20,000-character import cap. A real 12,000-character fragment also failed because AI paraphrased/combined English quotations and produced an unused matching target.
- Imports and persisted drafts now support 250,000 characters, 10 MB and 150 PDF pages. `lib/document-parts.ts` preserves the full text and partitions long documents into selectable lesson parts, with a preview and explicit scope notice. Part selection survives refresh. Results can continue to the next part without re-uploading. One active course remains the existing design; completed part courses are not archived as a library.
- Source normalization and accepted individual lessons remain bounded to 20,000 characters. No full-document coverage is claimed by a single generated lesson. A whitespace-leading short final tail is merged; regression tested.
- `lib/source-citations.ts` provides bounded original excerpts with IDs. AI selects IDs; the server supplies the exact quotations and still validates the full course/media. No fuzzy quotation matching or removal of validation. Invalid course output gets one regeneration attempt; two failed attempts preserve the draft and show a quality-control error without blaming educational material.
- One generation reserves at most 10,000 output tokens. HTTP 402 now reports a provider credit/key-limit problem. During real browser verification OpenRouter rejected the previous 14,000-token reservation because only 12,912 were affordable; a reduced-reservation request was accepted. Never disclose upstream billing details or credentials.
- Final verification: 31 unit tests, ESLint, TypeScript and production webpack build passed; all 76 Chromium checks passed across desktop, Pixel 7, iPhone and iPad emulation. The actual PDF imports intact on desktop/iPhone (108,326 characters, ten parts, no horizontal document overflow). A real-provider accepted lesson was replayed through the browser to results and next-part continuation without additional provider spending. Separate live generation of the automatically selected first part succeeded with the reduced token reservation. The preview at port 3200 runs the final build. Provider credit availability remains external and can change; Safari/physical-device limitations from earlier sections remain.

## Repeated quality rejection / direct OpenAI (2026-10-17)

- The user confirmed the first automatically selected PDF part with default settings. A direct OpenAI request reproduced a concrete failure twice: graph entries in concept three used evidenceIndex=2 (apparently the concept position), although the concept contained only one or two evidence references. A generic fresh-generation retry did not resolve this.
- Generation graphs now use source citation IDs, constrained to an enum of actual IDs. The server resolves graph citations to exact saved excerpts and computes local evidence indexes. It can add a graph's source excerpt to the concept while retaining the three-excerpt bound. Unknown references still reject output. Saved canonical courses/progress retain their existing numeric-index representation.
- Course/media generation schemas now express length/count/identifier bounds. Structured-output routing is required when using OpenRouter. A rejected course and content-free constraint paths are supplied to the single repair attempt; safe constraint-only diagnostics are logged server-side. No raw document, provider reply or credentials are logged. Empty unsuitable-source responses remain allowed by the generation schema and produce a specific 422 instead of invented concepts.
- The local preview was switched to direct OpenAI at the user's explicit request. The new key is stored only in ignored `.env.local` with mode 0600; the OpenRouter key variable is empty. Shared source still supports both providers. No credentials belong in handoff files.
- JSON Schema feature support was checked against https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses and routing against https://openrouter.ai/docs/guides/features/structured-outputs . Tests cover targeted repair payload, precise validation paths, explicit source rejection and diagram citation resolution; review found no remaining actionable issue in the resolution changes.
- Final direct OpenAI verification through the production application succeeded on the actual first PDF part with default settings: `/api/material` 200, accepted three-topic course, `/api/speech` 200 and a 29.616-second MP3 decoded/advanced playback. Completed one selected topic and continued to part two; the full 108,326-character draft remained. No replay/mock was used for this final live-provider journey. Headless playback does not establish audible quality on a physical device.
- Final checks: 35 unit tests, ESLint, TypeScript, production webpack build and all 76 Chromium browser checks passed. The production preview on port 3200 runs the new build with direct OpenAI. The review of graph-reference compilation reported no remaining actionable issue. Safari remains unverified on this host.
