# ADAPT

An adaptive multimedia lesson for the university course **Systemy Multimedialne Uczące**. The Polish interface teaches DNS, IP addresses and browser/server communication using an initial assessment, adapted explanations, an interactive diagram and bounded Smart Retry.

## Run locally

Requirements: Node.js 24 LTS and pnpm 12.3.4.

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. The app works without an API key. Optionally set `OPENAI_API_KEY` in `.env.local`; `OPENAI_MODEL` defaults to `gpt-4.1-mini`. Credentials stay server-side. Never commit secrets.

## Verify

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Browser tests need a supported Playwright operating system, an existing production build and no OpenAI key for the fallback assertions. Production: `pnpm build`, then `pnpm start`.

See [maintenance handoff](docs/HANDOFF.md) for architecture, completed verification, untested functionality and next steps. AI integration follows the [OpenAI text generation documentation](https://developers.openai.com/api/docs/guides/text).
