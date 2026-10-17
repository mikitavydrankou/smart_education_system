import { test, expect, type Page } from '@playwright/test'
import { knowledgeQuestions, practiceQuestions } from '../../lib/lesson-data'

async function assess(page: Page, weak = false) {
  for (const q of knowledgeQuestions) {
    const index = weak ? (q.answer + 1) % q.options.length : q.answer
    await page.getByRole('radio').nth(index).check()
    await page.getByRole('button', { name: 'Kontynuuj', exact: true }).click()
  }
}

test('complete adaptive journey, retry restoration, fallback and restart', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
  await page.getByRole('link', { name: /Rozpocznij lub wznów/ }).click()
  await expect(page.getByRole('heading', { name: 'Co już wiesz?' })).toBeVisible()
  await assess(page, true)
  await expect(page.getByText(/Tematy wymagające wyjaśnienia/)).toBeVisible()
  await expect(page.getByText(/Wpisujesz biblioteka.example/)).toBeVisible()
  await page.getByRole('button', { name: 'Pokaż przykład', exact: true }).click()
  await expect(page.getByText(/mechanizm rozwiązywania nazw odpytuje DNS/)).toBeVisible()
  await page.getByRole('button', { name: 'DNS', exact: true }).click()
  await expect(page.getByText(/Jeśli aktualny wynik jest w pamięci podręcznej/)).toBeVisible()
  await page.getByRole('button', { name: 'Odpowiedź', exact: true }).click()
  await expect(page.getByText(/Dane wracają do przeglądarki/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Posłuchaj wyjaśnienia' })).toBeVisible()
  await page.getByRole('button', { name: 'Przejdź do ćwiczeń' }).click()
  for (const [i, q] of practiceQuestions.entries()) {
    const wrong = i === 0 || i === 1
    await expect(page.getByRole('heading', { name: q.prompt, exact: true })).toBeVisible()
    await page.getByRole('radio').nth(wrong ? (q.answer + 1) % q.options.length : q.answer).check()
    await page.getByRole('button', { name: 'Sprawdź odpowiedź' }).click()
    await expect(page.getByRole('radio').first()).toBeDisabled()
    if (wrong) {
      if (i === 0) {
        await page.getByRole('button', { name: 'Wyjaśnij mój błąd' }).click()
        await expect(page.getByText('Wyjaśnienie z materiałów lekcji')).toBeVisible()
      }
      await page.getByRole('button', { name: 'Spróbuj w nowym zadaniu' }).click()
      await expect(page.getByRole('heading', { name: q.retry.prompt, exact: true })).toBeVisible()
      if (i === 0) {
        await page.reload()
        await expect(page.getByRole('heading', { name: q.retry.prompt, exact: true })).toBeVisible()
        await page.getByRole('button', { name: 'Krok po kroku', exact: true }).click()
        await expect(page.getByText(/Sprawdzana jest pamięć podręczna/)).toBeVisible()
      }
      await page.getByRole('radio').nth(i === 0 ? q.retry.answer : (q.retry.answer + 1) % q.retry.options.length).check()
      await page.getByRole('button', { name: 'Sprawdź odpowiedź' }).click()
      if (i === 1) await expect(page.getByText(/Ten temat warto jeszcze powtórzyć/)).toBeVisible()
    }
    if (i === 0) {
      await page.reload()
      await expect(page.getByText(/dodatkowe wyjaśnienie pomogło/)).toBeVisible()
    }
    await page.getByRole('button', { name: i === practiceQuestions.length - 1 ? 'Zobacz podsumowanie' : 'Następne zadanie' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Twoje podsumowanie' })).toBeVisible()
  await expect(page.getByText('Poprawnie za pierwszym razem: 3 z 5. Poprawnie po dodatkowym wyjaśnieniu: 1.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Warto powtórzyć', exact: true }).locator('..')).toContainText('Adresy IP')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Twoje podsumowanie' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/[\u0400-\u04ff]/u)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Przejdź lekcję ponownie' }).click()
  await expect(page.getByRole('heading', { name: 'Co już wiesz?' })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Pytanie 1 z 3')).toBeVisible()
  expect(errors).toEqual([])
})

test('known concepts show concise lessons; selected assessment answer survives refresh', async ({ page }) => {
  await page.goto('/results')
  await page.getByRole('radio').nth(knowledgeQuestions[0].answer).check()
  await page.reload()
  await expect(page.getByRole('radio').nth(knowledgeQuestions[0].answer)).toBeChecked()
  await page.getByRole('button', { name: 'Kontynuuj', exact: true }).click()
  for (const q of knowledgeQuestions.slice(1)) {
    await page.getByRole('radio').nth(q.answer).check()
    await page.getByRole('button', { name: 'Kontynuuj', exact: true }).click()
  }
  await expect(page.getByText(/Znasz już podstawowe pojęcia/)).toBeVisible()
  await expect(page.getByText(/DNS działa jak książka adresowa/)).toBeVisible()
  await page.goto('/lesson')
  await expect(page.getByText(/Znasz już podstawowe pojęcia/)).toBeVisible()
})

test('malformed storage, invalid API input, unsupported routes', async ({ page, request }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('adapt-session', '{broken'))
  await page.goto('/lesson')
  await expect(page.getByRole('heading', { name: 'Co już wiesz?' })).toBeVisible()
  const response = await request.post('/api/explain', { data: { questionId: 'unknown' } })
  expect(response.status()).toBe(400)
  const fallback = await request.post('/api/explain', { data: { questionId: 'p-dns', retry: false, selected: 0, style: 'simple' } })
  expect((await fallback.json()).source).toBe('fallback')
  expect((await page.goto('/missing'))!.status()).toBe(404)
})
