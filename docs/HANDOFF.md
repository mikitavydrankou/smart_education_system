# ADAPT maintenance handoff

## Product requirements

University prototype for the course “Systemy Multimedialne Uczące”. Complete the existing application rather than rebuilding it. Preserve its light background, mint/teal accent, rounded cards, typography and focused responsive interface. All user-facing text must be natural Polish; code and developer documentation remain English. Single topic: “Jak działa internet? DNS, adresy IP i serwery.” No accounts, database, catalog, gamification, chatbot or learning-style classification.

Required flow: welcome → three-question initial assessment (DNS/IP/server and browser) → adapted lesson → interactive network diagram → one practice question at a time → immediate feedback and Smart Retry → factual final summary. Correctness is deterministic TypeScript, never AI grading.

## Implemented

- Next.js 16.4 App Router, React 19, TypeScript, Tailwind 4, existing lucide icons/UI styling retained.
- `lib/lesson-data.ts`: typed Polish concept explanations, simpler versions, examples, steps, assessment and five practice questions with genuinely different retries. DNS cache, IP and browser/server distinctions covered.
- `lib/session.ts`: typed deterministic reducer; assessment answers, knowledge gaps, active/viewed concepts, selections, individual practice attempts and feedback/retry phases. Versioned restoration validates snapshots by replaying valid events. No untrusted stored scores. Duplicate assessment/practice submissions are guarded.
- `components/use-session.ts`: hydration-safe localStorage initialization and persistence; storage failures shown to users.
- `components/adapt-app.tsx`: original shell/cards retained, all stages connected. Assessment changes concise/expanded lesson text. Practice freezes submitted answers. Exactly one retry per question. Final concept aggregation retains review if any task is unresolved. Restart supported.
- `components/lesson-media.tsx`: clickable browser → DNS → IP → server → response diagram; Polish speech synthesis with stop, cleanup and missing-voice feedback.
- `components/mistake-explanation.tsx`, `lib/explanation.ts`, `lib/ai-explanation.ts`, `app/api/explain/route.ts`: optional mistake explanations; browser submits only known question ID, retry flag, wrong answer index and allowed style. Server resolves verified content. OpenAI Responses API, 10-second timeout, 350 output tokens, `store: false`, bounded text extraction. Missing credentials/errors use honest lesson fallback. Request validation, same-origin check, bounded process-local deduplication/cache; UI request cancellation and duplicate prevention. Rendered as text.
- `app/layout.tsx`: Polish metadata/language and consistent light theme. Removed `ignoreBuildErrors` from Next config. Unknown routes produce 404; `/lesson` and `/results` show current persisted stage.
- `.env.example`, `.gitignore`, lint/type/test scripts, ESLint config, deterministic tests and Playwright journeys added.

## Verification at handoff

Executed successfully:
- `pnpm test`: 10 deterministic tests, including duplicate assessment regression, retry restoration/limit, result aggregation, corrupted storage, bank invariants, missing key and mocked provider success/failure.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: production build passed; sandbox needed permission to open a local Turbopack port.

Not verified:
- Browser journeys are written in `tests/browser/lesson.spec.ts`, for desktop and Pixel 7, but **have not run**. Playwright 1.64.1 cannot install Chromium on this machine's macOS 13. Use a supported OS on the maintenance machine, then install Chromium and run the suite. Fix failures rather than claiming these tests pass.
- Actual paid OpenAI requests were not made. Successful provider transport was mocked; fallback was tested against real service logic. Verify with a real API key when available without exposing it.
- Audible speech, real system Polish voices, keyboard/focus behavior and actual mobile layout still require browser/manual verification.

## Recommended next steps

1. Read the code and this handoff, inspect git status, run existing checks.
2. On a supported OS, install Chromium and execute all browser journeys against a production build. Check full journey, both retry outcomes, refreshed selections/retry feedback/results, restart, diagram, adaptive content and API fallback. Fix application/test issues uncovered.
3. Verify speech synthesis with available/unavailable Polish voices and unsupported browsers. Test delayed voice availability; no audible test has been performed yet.
4. Review UX/accessibility and accuracy while preserving design. Check direct route behavior, selection persistence, storage failure and concept completion semantics. Current viewed-concept tracking records explicit tab visits; initial displayed topic is not automatically marked viewed. Decide whether to refine this.
5. Review AI service validation and actual provider response/error behavior. In-memory cache is instance-local, not a distributed rate limit; this is a university prototype. Do not expand into infrastructure work unless deployment requires it.
6. Polish any remaining issues, rerun tests/typecheck/lint/build and report exact results, limitations and run commands. Keep documentation in English and UI Polish.

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

Playwright starts a production server on 127.0.0.1:3100, so build first. The current fallback browser assertions expect the test server to have no API key. For production use `pnpm build` followed by `pnpm start`.
