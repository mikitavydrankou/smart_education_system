import { test, expect, type Page } from '@playwright/test'
import { knowledgeQuestions } from '../../lib/lesson-data'

async function openLesson(page: Page) {
  await page.goto('/lesson')
  for (const q of knowledgeQuestions) {
    await page.getByRole('radio').nth(q.answer).check()
    await page.getByRole('button', { name: 'Kontynuuj', exact: true }).click()
  }
}

// Browser speech is an external system API; emulate callbacks, not the component.
async function installSpeech(page: Page, polish = true) {
  await page.addInitScript(({ polish }) => {
    class Utterance extends EventTarget {
      lang = ''
      voice: unknown = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(public text: string) { super() }
      dispatchEvent(event: Event) {
        if (event.type === 'end') this.onend?.()
        if (event.type === 'error') this.onerror?.()
        return super.dispatchEvent(event)
      }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance })
    const utterances: SpeechSynthesisUtterance[] = []
    Object.defineProperty(window, '__utterances', { value: utterances })
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => polish ? [{ lang: 'pl-PL', name: 'Polski' }] : [],
      cancel: () => {},
      speak: (utterance: SpeechSynthesisUtterance) => { utterances.push(utterance) },
    } })
  }, { polish })
}

test('Polish speech starts, stops, and ignores callbacks from cancelled text', async ({ page }) => {
  await installSpeech(page)
  await openLesson(page)
  await page.getByRole('button', { name: 'Posłuchaj wyjaśnienia' }).click()
  await expect(page.getByRole('button', { name: 'Zatrzymaj czytanie' })).toBeVisible()
  expect(await page.evaluate(() => {
    const [utterance] = (window as unknown as { __utterances: SpeechSynthesisUtterance[] }).__utterances
    return { lang: utterance.lang, voice: utterance.voice?.lang, text: utterance.text }
  })).toMatchObject({ lang: 'pl-PL', voice: 'pl-PL', text: expect.stringContaining('DNS') })
  await page.getByRole('button', { name: 'Pokaż przykład', exact: true }).click()
  await page.getByRole('button', { name: 'Posłuchaj wyjaśnienia' }).click()
  await page.evaluate(async () => {
    const [old] = (window as unknown as { __utterances: SpeechSynthesisUtterance[] }).__utterances
    old.dispatchEvent(new Event('end'))
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  })
  await expect(page.getByRole('button', { name: 'Zatrzymaj czytanie' })).toBeVisible()
  await page.getByRole('button', { name: 'Zatrzymaj czytanie' }).click()
  await expect(page.getByRole('button', { name: 'Posłuchaj wyjaśnienia' })).toBeVisible()
})

test('Polish voice can become available after the first attempt', async ({ page }) => {
  await installSpeech(page, false)
  await openLesson(page)
  await page.getByRole('button', { name: 'Posłuchaj wyjaśnienia' }).click()
  await expect(page.getByText(/Brak polskiego głosu/)).toBeVisible()
  await page.evaluate(() => {
    window.speechSynthesis.getVoices = () => [{ lang: 'pl-PL', name: 'Polski' } as SpeechSynthesisVoice]
  })
  await page.getByRole('button', { name: 'Posłuchaj wyjaśnienia' }).click()
  await expect(page.getByRole('button', { name: 'Zatrzymaj czytanie' })).toBeVisible()
  await expect(page.getByText(/Brak polskiego głosu/)).toHaveCount(0)
})

test('unsupported speech and denied storage leave the lesson usable', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
    Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError') }
  })
  await openLesson(page)
  await expect(page.getByText(/Przeglądarka nie pozwala zapisać postępów/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Posłuchaj wyjaśnienia' })).toBeDisabled()
  await expect(page.getByText(/Odczyt głosowy jest niedostępny/)).toBeVisible()
  await page.getByRole('button', { name: 'Przejdź do ćwiczeń' }).click()
  await expect(page.getByRole('button', { name: 'Sprawdź odpowiedź' })).toBeVisible()
})
