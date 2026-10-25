import { test, expect, type Page } from '@playwright/test'
import { createLmsFixture } from '../lms-fixture'

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Hasło', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
}

test.describe('local Supabase material setup and study gate', () => {
  test.skip(process.env.LMS_E2E !== '1', 'Requires an isolated local Supabase instance.')

  test('creates selected and shared editors without discarding authored material', async ({ page }) => {
    const fixture = await createLmsFixture()
    try {
      await login(page, fixture.teacherEmail, fixture.password)
      await page.goto(`/courses/${fixture.courseId}/lessons/new`)
      await page.getByRole('button', { name: 'Utwórz wersje', exact: true }).click()
      const variants = page.locator('section.lms-card').filter({ has: page.getByRole('heading', { name: /^Wersja / }) })
      await expect(variants).toHaveCount(3)
      await expect(variants.nth(0).getByRole('checkbox', { name: 'Wzrokowiec', exact: true })).toBeChecked()
      await expect(variants.nth(1).getByRole('checkbox', { name: 'Słuchowiec', exact: true })).toBeChecked()
      await expect(variants.nth(2).getByRole('checkbox', { name: 'Kinestetyk', exact: true })).toBeChecked()

      await page.reload()
      await page.getByRole('combobox', { name: 'Wersja dla: Słuchowiec', exact: true }).selectOption('1')
      await page.getByRole('button', { name: 'Utwórz wersje', exact: true }).click()
      await expect(variants).toHaveCount(2)
      await expect(variants.nth(0).getByRole('checkbox', { name: 'Słuchowiec', exact: true })).toBeChecked()
      await variants.nth(1).getByRole('combobox', { name: 'Dodaj blok', exact: true }).selectOption('practice')
      await variants.nth(1).getByLabel('Treść', { exact: true }).fill('Wybierz poprawny krok.')
      await variants.nth(1).getByLabel('Opcje ćwiczenia — każda w osobnym wierszu', { exact: true }).fill('Sprawdź domenę\nPodaj hasło')
      await variants.nth(1).getByRole('radio', { name: 'Sprawdź domenę', exact: true }).check()
      await page.getByLabel('Tytuł lekcji', { exact: true }).fill('Dwie wersje i ćwiczenie')
      await page.getByRole('button', { name: 'Zapisz szkic', exact: true }).click()
      await expect(page).toHaveURL(/\/lessons\/[^/]+\/edit$/)
      await page.reload()
      await expect(variants).toHaveCount(2)
      await expect(page.getByRole('button', { name: 'Utwórz wersje', exact: true })).toHaveCount(0)
      await expect(page.getByRole('textbox', { name: 'Treść', exact: true })).toHaveValue('Wybierz poprawny krok.')
      await expect(page.getByRole('radio', { name: 'Sprawdź domenę', exact: true })).toBeChecked()

      await page.goto(`/courses/${fixture.courseId}/lessons/new`)
      await page.getByRole('combobox', { name: 'Sposób przygotowania treści', exact: true }).selectOption('shared')
      await page.getByRole('button', { name: 'Utwórz wersje', exact: true }).click()
      await expect(variants).toHaveCount(1)
      await expect(variants.getByRole('checkbox', { checked: true })).toHaveCount(3)
    } finally { await fixture.cleanup() }
  })

  test('demo practice requires correct ordering and changing style resets material completion', async ({ page }) => {
    test.setTimeout(60_000)
    const fixture = await createLmsFixture()
    try {
      await login(page, fixture.teacherEmail, fixture.password)
      const demo = await page.evaluate(async () => {
        const response = await fetch('/api/lms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'create_demo_course', args: {} }) })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error)
        return body.data as string
      })
      await page.goto(`/courses/${demo}?preview=1`)
      await page.getByRole('link', { name: /Widok studenta/ }).first().click()
      await expect(page.getByRole('button', { name: 'Wzrokowiec', exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Słuchowiec', exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Słuchowiec', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Posłuchaj wyjaśnienia', exact: true })).toBeDisabled()
      await expect(page.getByText('DEMO', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Kinestetyk', exact: true }).click()
      const testButton = page.getByRole('button', { name: 'Przejdź do testu', exact: true })
      await expect(testButton).toBeDisabled()
      await page.getByRole('button', { name: 'Potwierdzam zapoznanie się z materiałem', exact: true }).click()
      const check = page.getByRole('button', { name: 'Sprawdź ćwiczenie i kontynuuj', exact: true })
      await check.click()
      await expect(page.locator('p[role=alert]')).toContainText('To jeszcze nie jest poprawne rozwiązanie')
      await expect(testButton).toBeDisabled()
      await page.getByRole('button', { name: 'Przenieś wyżej: Nazwa domeny', exact: true }).click()
      await page.getByRole('button', { name: 'Przenieś wyżej: Nazwa domeny', exact: true }).click()
      await page.getByRole('button', { name: 'Przenieś wyżej: DNS', exact: true }).click()
      await check.click()
      await expect(testButton).toBeEnabled()
      await expect(page.getByRole('status')).toContainText('2 / 2')
      await page.getByRole('button', { name: 'Wzrokowiec', exact: true }).click()
      await expect(testButton).toBeDisabled()
      await expect(page.getByRole('status')).toContainText('0 / 3')
      await page.getByRole('button', { name: 'Kinestetyk', exact: true }).click()
      await expect(testButton).toBeDisabled()
      await expect(page.getByRole('status')).toContainText('0 / 2')
    } finally { await fixture.cleanup() }
  })
})
