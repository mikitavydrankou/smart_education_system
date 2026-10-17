/** Resolve server-side AI credentials. OpenAI wins when both keys are set. */
export function resolveAiProvider(): { router: boolean; key: string } | null {
  const openai = process.env.OPENAI_API_KEY?.trim()
  if (openai) return { router: false, key: openai }
  const openrouter = process.env.OPENROUTER_API_KEY?.trim()
  if (openrouter) return { router: true, key: openrouter }
  return null
}
