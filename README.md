# ADAPT

An adaptive learning workspace for the university course **Systemy Multimedialne Uczące**. Add your own source material, choose learning preferences, inspect generated topics and study through text, visual steps, audio and practice with bounded retry. A separate deterministic DNS/IP example remains available.

The Polish interface uses an Apple-inspired system-font design with responsive layouts and automatic light/dark appearance. `/workspace` accepts pasted text, TXT/Markdown, DOCX (Mammoth) and text-based PDF (PDF.js). Generation uses the configured OpenRouter/OpenAI key, validates exact source quotations and saves course/progress locally. See [reuse research and next architecture](docs/ADAPT-NEXT.md) and [third-party notices](docs/THIRD-PARTY-NOTICES.md).

## Run locally

Requirements: Node.js 24 LTS and pnpm 12.3.4.

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. The example lesson at `/lesson` works without an API key. Creating courses from your material at `/workspace` requires `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in `.env.local`. `OPENAI_MODEL` defaults to `gpt-4.1-mini`. Credentials stay server-side. Never commit secrets. Copy `.env.example` only on first setup; do not overwrite existing credentials.

Alternatively set `OPENROUTER_API_KEY` and optionally `OPENROUTER_MODEL` (default `openai/gpt-4.1-mini`). `OPENAI_API_KEY` takes precedence when both provider keys are configured; OpenRouter uses its compatible [Responses API](https://openrouter.ai/docs/api_reference/responses/overview). The example lesson has verified fallback explanations. User-material generation instead reports provider errors and preserves the draft; it never substitutes a fictional generic course.

## Own-material workflow

1. Open `/workspace`, paste text or import a file. Files are extracted on the device; generation sends extracted text and preferences to the server-side AI provider only after the user requests it.
2. Choose goal, explanation level, time and a starting format. These are editable preferences, not fixed learning-style labels.
3. Inspect the generated outline and select topics. All concepts include exact source excerpts; an accepted quotation does not guarantee that every AI statement is correct, so inspect important material.
4. Switch between text, source-linked diagrams, Polish MP3 narration and interactive ordering/matching/classification. After an incorrect answer, read extra scaffolding and try one distinct task.
5. Review per-topic results, refresh to resume, or restart. Source, settings and progress stay in this browser's localStorage; there is no account or cross-device synchronization. Storage failure is shown explicitly.

Limits: 120–250,000 text characters, 10 MB per file, at most 150 PDF pages. Long documents are retained locally and divided into selectable parts, usually up to 12,000 characters (a small tail may merge into the preceding part, within the 20,000-character lesson bound). Each lesson covers its selected part; the results offer continuation to the next part. Scanned PDFs need external OCR. Complex PDF reading order/tables can require manual cleanup; extraction does not preserve original page coordinates. Audio uses server-generated MP3 with transcript/system-voice fallback. Generated diagrams and activities are validated structured data. No scheduled repetition or accounts are implemented. Provider evidence references are resolved to exact source excerpts on the server; a rejected course gets one bounded regeneration attempt. Provider credit errors are distinguished from content-validation failures.

## Verify

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

The default browser suite covers desktop, Pixel 7, iPhone 13 and iPad Pro 11 sizes in Chromium. WebKit checks are separate: install its browser/system dependencies with Playwright, then run `npm run test:e2e:apple`. These emulate Safari/iPhone/iPad and do not replace physical-device testing.

Browser tests need a supported Playwright operating system and an existing production build. They start an isolated server with both provider keys disabled for fallback assertions; keep port 3100 free. Production: `pnpm build`, then `pnpm start`. On restricted hosts where Turbopack cannot bind its CSS worker port, `npm run build -- --webpack` builds the same app with Webpack.

See [maintenance handoff](docs/HANDOFF.md) for architecture, completed verification, untested functionality and next steps. AI integration follows the [OpenAI text generation documentation](https://developers.openai.com/api/docs/guides/text).

### Multimodal adaptation

The Polish workspace supports source-linked diagrams, server-generated Polish MP3 narration (with transcript/system-speech fallback), and interactive ordering, matching and classification tasks. New courses include these representations; existing saved progress is migrated.

Automatic presentation selection learns provisionally from first-attempt knowledge checks across courses, with exploration, sparse-data messaging and a manual override. It does not diagnose a permanent visual/auditory/kinesthetic type. See [research and policy](docs/LEARNER-PROFILE-RESEARCH.md) for evidence and limitations. Optional narration settings are listed in `.env.example`; provider keys remain server-only.
