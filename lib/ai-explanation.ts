import { resolveMistake } from './explanation.ts'

type Mistake = NonNullable<ReturnType<typeof resolveMistake>>
export async function explainMistake(mistake: Mistake): Promise<{ text: string; source: 'ai' | 'fallback' }> {
  const fallback = { text: mistake.fallback, source: 'fallback' as const }
  if (!process.env.OPENAI_API_KEY) return fallback
  try {
    const { fallback: verifiedAlternative, ...context } = mistake
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', store: false, max_output_tokens: 350,
        instructions: 'Wyjaśniasz pojedynczy błąd w lekcji o internecie. Odpowiedz wyłącznie po polsku, w 2–4 krótkich zdaniach, bez formatowania. Wyjaśnij, dlaczego wybrana odpowiedź jest błędna, i odnieś ją do poprawnej. Korzystaj wyłącznie ze zweryfikowanego wyjaśnienia i alternatywy. Nie zmieniaj poprawnej odpowiedzi. Nie oceniaj ucznia, nie steruj nawigacją, nie prowadź rozmowy. Styl simple oznacza proste słowa, example konkretny przykład, steps kroki.',
        input: JSON.stringify({ ...context, verifiedAlternative }),
      }),
    })
    if (!response.ok) return fallback
    const data = await response.json()
    if (data.status !== 'completed' || !Array.isArray(data.output)) return fallback
    const text = data.output.flatMap((item: { type?: string; content?: { type?: string; text?: string }[] }) => item.type === 'message' && Array.isArray(item.content) ? item.content.filter(c => c.type === 'output_text' && typeof c.text === 'string').map(c => c.text) : []).join('\n').trim()
    return text && text.length <= 2000 ? { text, source: 'ai' } : fallback
  } catch { return fallback }
}
