import { test, expect, type Page } from '@playwright/test'
import { knowledgeQuestions } from '../../lib/lesson-data'

async function openLesson(page: Page) {
  await page.goto('/lesson')
  for (const question of knowledgeQuestions) {
    await page.getByRole('radio').nth(question.answer).check()
    await page.getByRole('button', { name: 'Kontynuuj', exact: true }).click()
  }
}

test('narration is explicitly a demo without speech or audio requests', async ({ page }) => {
  const audioRequests: string[] = []
  page.on('request', request => { if (request.url().includes('/api/speech')) audioRequests.push(request.url()) })
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: { cancel: () => {}, speak: () => { throw new Error('Demo must not invoke speech') } } })
  })
  await openLesson(page)
  await expect(page.getByRole('button', { name: 'Posłuchaj wyjaśnienia', exact: true })).toBeDisabled()
  await expect(page.getByText('DEMO', { exact: true })).toBeVisible()
  await expect(page.getByText(/Odtwarzacz demonstracyjny — bez odtwarzania dźwięku/)).toBeVisible()
  await page.getByRole('button', { name: 'Pokaż przykład', exact: true }).click()
  await expect(page.getByText(/mechanizm rozwiązywania nazw odpytuje DNS/)).toBeVisible()
  expect(audioRequests).toEqual([])
})

test('demo audio and denied storage leave lesson progression usable', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
    Storage.prototype.setItem = () => { throw new DOMException('Denied', 'SecurityError') }
  })
  await openLesson(page)
  await expect(page.getByText(/Przeglądarka nie pozwala zapisać postępów/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Posłuchaj wyjaśnienia', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Przejdź do ćwiczeń' }).click()
  await expect(page.getByRole('button', { name: 'Sprawdź odpowiedź' })).toBeVisible()
})
