import { test, expect } from '@playwright/test'
import { createLmsFixture } from '../lms-fixture'
import { readMaterial } from './lms-helpers'

test.describe('local Supabase lesson constructor', () => {
  test.skip(process.env.LMS_E2E !== '1', 'Requires an isolated local Supabase instance.')

  test('drafts, grouped variants, six question types and safe student preview', async ({ page }) => {
    test.setTimeout(60_000)
    page.setDefaultTimeout(10_000)
    const fixture = await createLmsFixture()
    try {
      await page.goto('/login')
      await page.getByLabel('Email', { exact: true }).fill(fixture.teacherEmail)
      await page.getByLabel('Hasło', { exact: true }).fill(fixture.password)
      await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click()
      await expect(page).toHaveURL(/\/$/)

      for (const lessonId of [fixture.firstLessonId, fixture.secondLessonId]) {
        await page.goto(`/courses/${fixture.courseId}/lessons/${lessonId}?preview=1`)
        await page.getByRole('button', { name: 'Wzrokowiec', exact: true }).click()
        await readMaterial(page)
        await page.getByRole('button', { name: 'Przejdź do testu' }).click()
        await page.getByRole('radio', { name: 'Cztery', exact: true }).check()
        await page.getByRole('button', { name: 'Zakończ test' }).click()
        await expect(page.getByRole('heading', { name: 'Test zaliczony!' })).toBeVisible()
      }

      await page.goto(`/courses/${fixture.courseId}`)
      await page.getByRole('link', { name: 'Dodaj lekcję', exact: true }).click()
      await page.getByLabel('Tytuł lekcji', { exact: true }).fill('Konstruktor wszystkich zadań')
      await page.getByRole('button', { name: 'Opublikuj lekcję', exact: true }).click()
      await expect(page.locator('ul[role=alert]')).toContainText('Dodaj co najmniej jedną wersję treści.')
      await page.getByRole('button', { name: 'Zapisz szkic', exact: true }).click()
      await expect(page).toHaveURL(/\/lessons\/[^/]+\/edit$/)
      const editUrl = page.url()
      const lessonUrl = editUrl.replace(/\/edit$/, '')

      await page.getByRole('button', { name: 'Dodaj wersję', exact: true }).click()
      const variants = page.locator('section.lms-card').filter({ has: page.getByRole('heading', { name: /^Wersja / }) })
      const shared = variants.nth(0)
      await shared.getByRole('checkbox', { name: 'Wzrokowiec', exact: true }).check()
      await shared.getByRole('checkbox', { name: 'Słuchowiec', exact: true }).check()
      await shared.getByRole('combobox', { name: 'Dodaj blok', exact: true }).selectOption('text')
      await shared.getByLabel('Treść', { exact: true }).fill('Materiał wspólny dla dwóch formatów.')
      await page.getByRole('button', { name: 'Dodaj wersję', exact: true }).click()
      const practice = variants.nth(1)
      await expect(practice.getByRole('checkbox', { name: 'Wzrokowiec', exact: true })).toBeDisabled()
      await practice.getByRole('checkbox', { name: 'Kinestetyk', exact: true }).check()
      await practice.getByRole('combobox', { name: 'Dodaj blok', exact: true }).selectOption('practice')
      await practice.getByLabel('Treść', { exact: true }).fill('Wykonaj doświadczenie praktyczne.')
      await practice.getByLabel('Opcje ćwiczenia — każda w osobnym wierszu', { exact: true }).fill('Poprawny krok\nBłędny krok')

      await shared.getByRole('combobox', { name: 'Dodaj blok', exact: true }).selectOption('audio')
      await shared.getByLabel('Adres pliku', { exact: true }).fill('https://example.test/recording.mp3')
      await page.getByRole('button', { name: 'Opublikuj lekcję', exact: true }).click()
      await expect(page.locator('ul[role=alert]')).toContainText('Nagranie wymaga transkrypcji.')
      await shared.getByLabel('Transkrypcja', { exact: true }).fill('Tekst nagrania dla słuchowca.')

      const types = ['single', 'multiple', 'boolean', 'short', 'matching', 'ordering']
      for (const [index, type] of types.entries()) {
        await page.getByRole('button', { name: 'Dodaj zadanie', exact: true }).click()
        const question = page.locator('section.lms-card').filter({ has: page.getByRole('heading', { name: `Zadanie ${index + 1}`, exact: true }) })
        await question.getByRole('combobox', { name: 'Rodzaj zadania', exact: true }).selectOption(type)
        await question.getByLabel('Pytanie', { exact: true }).fill(`Pytanie ${type}`)
        if (type === 'single' || type === 'multiple') {
          await question.getByLabel('Opcje — każda w osobnym wierszu', { exact: true }).fill('Tak\nNie')
          await question.getByRole(type === 'single' ? 'radio' : 'checkbox', { name: 'Tak', exact: true }).check()
        } else if (type === 'short') {
          await question.getByLabel('Akceptowane odpowiedzi — każda w osobnym wierszu', { exact: true }).fill('sekretny-wzorzec-odpowiedzi')
        } else if (type === 'matching') {
          for (const pair of [1, 2]) {
            await question.getByRole('button', { name: 'Dodaj parę', exact: true }).click()
            await question.getByLabel(`Lewa strona pary ${pair}`, { exact: true }).fill(`Pojęcie ${pair}`)
            await question.getByLabel(`Prawa strona pary ${pair}`, { exact: true }).fill(`Znaczenie ${pair}`)
          }
        } else if (type === 'ordering') {
          await question.getByLabel('Elementy w poprawnej kolejności — każdy w osobnym wierszu', { exact: true }).fill('Początek\nKoniec')
        }
      }
      await page.getByRole('button', { name: 'Opublikuj lekcję', exact: true }).click()
      await expect(page.getByRole('status')).toContainText('Lekcja opublikowana.')
      await page.goto(`${lessonUrl}?preview=1`)
      await page.getByRole('button', { name: 'Słuchowiec', exact: true }).click()
      await expect(page.getByText('Materiał wspólny dla dwóch formatów.', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Kinestetyk', exact: true }).click()
      await expect(page.getByText('Wykonaj doświadczenie praktyczne.', { exact: true })).toBeVisible()
      await readMaterial(page)
      expect(await page.content()).not.toContain('sekretny-wzorzec-odpowiedzi')
      await page.getByRole('button', { name: 'Przejdź do testu' }).click()
      await expect(page.getByRole('group')).toHaveCount(6)
      await expect(page.getByRole('combobox', { name: 'Pojęcie 1', exact: true })).toBeVisible()
      expect(await page.content()).not.toContain('Pojęcie 1|Znaczenie 1')
      await page.getByRole('button', { name: 'Zakończ test', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Spróbuj ponownie' })).toBeVisible()
    } finally {
      await fixture.cleanup()
    }
  })
})
