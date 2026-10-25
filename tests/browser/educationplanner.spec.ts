import { test, expect } from '@playwright/test'
import { createLmsFixture } from '../lms-fixture'

test('complete Polish questionnaire resumes drafts, resolves ties and unlocks enrollment', async ({ page }) => {
  test.skip(process.env.LMS_E2E !== '1', 'Requires the isolated local Supabase instance.')
  const fixture = await createLmsFixture({ usePublishedAssessment: true })
  try {
    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(fixture.studentEmail)
    await page.getByLabel('Hasło', { exact: true }).fill(fixture.password)
    await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click()
    await expect(page).toHaveURL(/\/assessment$/)
    const questions = page.locator('fieldset.lms-card')
    await expect(questions).toHaveCount(20)
    for (let index = 0; index < 7; index++) await questions.nth(index).getByRole('radio').nth(0).check()
    await page.getByRole('button', { name: 'Zapisz odpowiedzi', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Odpowiedzi zapisane')
    await page.reload()
    for (let index = 0; index < 7; index++) await expect(questions.nth(index).getByRole('radio').nth(0)).toBeChecked()
    for (let index = 7; index < 20; index++) await questions.nth(index).getByRole('radio').nth(index < 10 ? 0 : 1).check()
    await page.getByRole('button', { name: 'Zakończ ankietę', exact: true }).click()
    const tie = page.getByRole('group', { name: 'Wybierz format początkowy' })
    await expect(tie.getByRole('radio')).toHaveCount(2)
    await tie.getByRole('radio', { name: 'Wzrokowiec', exact: true }).check()
    await page.getByRole('button', { name: 'Zakończ ankietę', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Wybrany format: Wzrokowiec', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Wybrany format: Wzrokowiec', exact: true })).toBeVisible()
    await page.goto(`/courses/${fixture.courseId}`)
    await page.getByRole('button', { name: 'Zapisz się', exact: true }).click()
    await expect(page.getByText('Twoje zgłoszenie czeka na zatwierdzenie przez prowadzącego.')).toBeVisible()
  } finally { await fixture.cleanup() }
})
