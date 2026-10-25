import { test, expect, type Page } from '@playwright/test'
import { createLmsFixture } from '../lms-fixture'

test('choose a role at signup and see every user of the opposite role', async ({ page, browser }) => {
  test.setTimeout(90_000)
  test.skip(process.env.LMS_E2E !== '1', 'Requires isolated local Supabase.')
  const fixture = await createLmsFixture()
  const teacherContext = await browser.newContext()
  try {
    const teacher = await teacherContext.newPage()
    const signup = async (target: Page, email: string, name: string, role: string) => {
      await target.goto('/register')
      await target.getByLabel('Imię i nazwisko', { exact: true }).fill(name)
      await target.getByRole('radio', { name: role, exact: true }).check()
      await target.getByLabel('Email', { exact: true }).fill(email)
      await target.getByLabel('Hasło', { exact: true }).fill(fixture.password)
      await target.getByRole('button', { name: 'Utwórz konto', exact: true }).click()
    }
    const teacherName = `Nauczyciel ${fixture.courseId}`
    const studentName = `Student ${fixture.courseId}`
    await signup(teacher, fixture.signupTeacherEmail, teacherName, 'Nauczyciel')
    await expect(teacher).toHaveURL(/\/teacher$/)
    await expect(teacher.getByRole('heading', { name: 'Panel nauczyciela' })).toBeVisible()
    await signup(page, fixture.signupStudentEmail, studentName, 'Student')
    await expect(page).toHaveURL(/\/assessment$/)
    if ((page.viewportSize()?.width ?? 0) < 1000) await page.getByRole('button', { name: 'Menu nawigacji', exact: true }).click()
    await page.getByRole('link', { name: 'Nauczyciele', exact: true }).click()
    await expect(page.getByRole('heading', { name: teacherName, exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: studentName, exact: true })).toHaveCount(0)
    const teacherMenu = teacher.getByRole('button', { name: 'Menu nawigacji', exact: true })
    if (await teacherMenu.isVisible()) await teacherMenu.click()
    await teacher.getByRole('link', { name: 'Studenci', exact: true }).click()
    await expect(teacher.getByRole('heading', { name: studentName, exact: true })).toBeVisible()
    await expect(teacher.getByRole('heading', { name: teacherName, exact: true })).toHaveCount(0)
  } finally { await teacherContext.close(); await fixture.cleanup() }
})
