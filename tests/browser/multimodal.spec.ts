import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { richCourseFixture, courseFixture, sourceText } from '../material-fixture'
import { createLearning, reduceLearning, normalizeSource, defaultProfile, validateCourse } from '../../lib/material'

test('diagrams expose relationships and ordering survives refresh with honest feedback', async ({ page }) => {
  await page.route('**/api/material', route => {
    if (route.request().url().includes('/api/material/media')) return route.fulfill({ json: { course: richCourseFixture } })
    return route.fulfill({ json: { course: richCourseFixture } })
  })
  await page.goto('/workspace')
  await page.getByLabel('Materiał źródłowy', { exact: true }).fill(sourceText)
  await page.getByRole('button', { name: 'Przygotuj moją lekcję' }).click()
  await page.getByRole('button', { name: 'Zacznij naukę' }).click()
  await page.getByRole('button', { name: 'Schemat', exact: true }).click()
  await page.getByRole('button', { name: 'Element: Światło', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Światło dostarcza energię do procesu.', { exact: true })).toBeVisible()
  await page.getByText('Opis tekstowy wszystkich relacji').click()
  await expect(page.getByText('Światło → dostarcza energię → Chloroplasty', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Praktyka', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Zadanie interaktywne' })).toBeVisible()
  await page.getByRole('button', { name: 'Sprawdź układ' }).click()
  await expect(page.getByText(/Ten układ wymaga zmiany/)).toBeVisible()
  await page.getByLabel('Pozycja: Dostarczenie światła', { exact: true }).selectOption('0')
  await page.reload()
  await expect(page.getByLabel('Pozycja: Dostarczenie światła', { exact: true })).toHaveValue('0')
  await page.getByRole('button', { name: 'Sprawdź układ' }).click()
  await expect(page.getByText(/Poprawny układ/)).toBeVisible()
  await page.getByRole('button', { name: 'Sprawdź zrozumienie' }).click()
  await page.getByRole('radio').first().check()
  await page.getByRole('button', { name: 'Sprawdź odpowiedź' }).click()
  await page.getByRole('button', { name: 'Następny temat' }).click()
  await page.getByRole('button', { name: 'Praktyka', exact: true }).click()
  await page.getByLabel('Dopasowanie: Chlorofil', { exact: true }).selectOption('pigment')
  await page.getByLabel('Dopasowanie: Chloroplast', { exact: true }).selectOption('place')
  await page.getByLabel('Dopasowanie: Światło', { exact: true }).selectOption('energy')
  await page.getByRole('button', { name: 'Sprawdź układ' }).click()
  await expect(page.getByText(/Poprawny układ/)).toBeVisible()
  await page.getByRole('button', { name: 'Sprawdź zrozumienie' }).click()
  await page.getByRole('radio').first().check()
  await page.getByRole('button', { name: 'Sprawdź odpowiedź' }).click()
  await page.getByRole('button', { name: 'Następny temat' }).click()
  await page.getByRole('button', { name: 'Praktyka', exact: true }).click()
  await page.getByLabel('Dopasowanie: Woda', { exact: true }).selectOption('input')
  await page.getByLabel('Dopasowanie: Tlen', { exact: true }).selectOption('output')
  await page.getByLabel('Dopasowanie: Dwutlenek węgla', { exact: true }).selectOption('input')
  await page.getByRole('button', { name: 'Sprawdź układ' }).click()
  await expect(page.getByText(/Poprawny układ/)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('real audio controls, playback evidence and unavailable-provider fallback', async ({ page }) => {
  await page.addInitScript(() => {
    class Utterance {
      lang = ''; voice = null; onstart?: () => void
      constructor(public text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance })
    Object.defineProperty(window, 'speechSynthesis', { value: {
      getVoices: () => [{ lang: 'pl-PL', name: 'Polski' }], cancel: () => {},
      speak: (u: Utterance) => u.onstart?.(),
    } })
  })
  await page.route('**/api/material', route => {
    if (route.request().url().includes('/api/material/media')) return route.fulfill({ json: { course: richCourseFixture } })
    return route.fulfill({ json: { course: richCourseFixture } })
  })
  await page.route('**/api/speech', route => route.fulfill({ contentType: 'audio/mpeg', body: readFileSync('tests/fixtures/narration.mp3') }))
  await page.goto('/workspace')
  await page.getByLabel('Materiał źródłowy', { exact: true }).fill(sourceText)
  await page.getByRole('button', { name: 'Przygotuj moją lekcję' }).click()
  await page.getByRole('button', { name: 'Zacznij naukę' }).click()
  await page.getByRole('button', { name: 'Audio', exact: true }).click()
  await page.getByRole('button', { name: 'Przygotuj nagranie' }).click()
  const audio = page.locator('audio')
  await expect(audio).toHaveAttribute('controls', '')
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.readyState)).toBeGreaterThan(0)
  await page.getByLabel('Tempo nagrania', { exact: true }).selectOption('1.25')
  expect(await audio.evaluate((el: HTMLAudioElement) => el.playbackRate)).toBe(1.25)
  await audio.evaluate((el: HTMLAudioElement) => el.play())
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('adapt-workspace-v1')!).learning.observed)).toBe(true)
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{
    const request=indexedDB.open('adapt-device-v1',1)
    request.onsuccess=()=>{const db=request.result,tx=db.transaction('audio','readwrite');tx.objectStore('audio').clear();tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}
    request.onerror=()=>reject(request.error)
  }))
  await page.route('**/api/speech', route => route.fulfill({ status: 503, json: { error: 'Nagrania AI są niedostępne.' } }))
  await page.getByRole('button', { name: 'Audio', exact: true }).click()
  await page.getByRole('button', { name: 'Przygotuj nagranie' }).click()
  await expect(page.getByText('Nagrania AI są niedostępne.', { exact: true })).toBeVisible()
  await page.getByText('Transkrypcja i odczyt systemowy').click()
  await expect(page.getByRole('button', { name: 'Posłuchaj wyjaśnienia' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('adapt-workspace-v1')!).learning.observed)).toBe(false)
  await page.getByRole('button', { name: 'Posłuchaj wyjaśnienia' }).click()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('adapt-workspace-v1')!).learning.observed)).toBe(true)
  await page.getByRole('button', { name: 'Sprawdź zrozumienie' }).click()
  await expect(page.getByRole('button', { name: 'Audio', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Zatrzymaj czytanie' })).toBeVisible()
})

test('text-only generation opens a lesson and enriches media on demand', async ({ page }) => {
  let mediaCalls = 0
  await page.route('**/api/material**', route => {
    const url = route.request().url()
    if (url.includes('/api/material/media')) {
      mediaCalls++
      return route.fulfill({ json: { course: richCourseFixture } })
    }
    if (url.match(/\/api\/material\/?(\?|$)/)) return route.fulfill({ json: { course: courseFixture } })
    return route.fallback()
  })
  await page.goto('/workspace')
  await page.getByLabel('Nie wiem, co pomaga — poznaj mój sposób nauki').uncheck()
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  await page.getByLabel('Materiał źródłowy', { exact: true }).fill(sourceText)
  await page.getByRole('button', { name: 'Przygotuj moją lekcję' }).click()
  await expect(page.getByRole('heading', { name: 'Twoja mapa nauki' })).toBeVisible()
  expect(mediaCalls).toBe(0)
  await page.getByRole('button', { name: 'Zacznij naukę' }).click()
  await expect(page.getByText(/Schemat i ćwiczenie korzystają na razie z cytatów/)).toBeVisible()
  const mediaWait = page.waitForRequest(r => r.url().includes('/api/material/media'), { timeout: 10_000 })
  await page.getByRole('button', { name: 'Schemat', exact: true }).click()
  await mediaWait
  expect(mediaCalls).toBe(1)
  await expect(page.getByRole('button', { name: 'Element: Światło', exact: true })).toBeVisible()
})

test('automatic support responds to errors, can be disabled and preserves old progress', async ({ page }) => {
  const course = validateCourse(courseFixture, normalizeSource(sourceText)!)!
  let old = createLearning(course, defaultProfile)
  old = reduceLearning(old, { type: 'start', ids: old.ids }, course)
  old = reduceLearning(old, { type: 'select', answer: 2 }, course)
  old = reduceLearning(old, { type: 'submit' }, course)
  await page.goto('/workspace')
  await page.evaluate(w => localStorage.setItem('adapt-workspace-v1', JSON.stringify(w)), { version: 1, source: normalizeSource(sourceText), profile: defaultProfile, course, name: 'Stara lekcja', learning: old })
  await page.reload()
  await expect(page.getByText('Przyjrzyjmy się temu jeszcze raz.')).toBeVisible()
  await page.getByRole('button', { name: 'Spróbuj w nowym zadaniu' }).click()
  await expect(page.getByRole('button', { name: 'Schemat', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('checkbox', { name: /Dobieraj sposób podania/ }).uncheck()
  await page.reload()
  await expect(page.getByRole('checkbox', { name: /Dobieraj sposób podania/ })).not.toBeChecked()
  await expect(page.getByRole('radio')).toHaveCount(3)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('adapt-workspace-v1')!).version)).toBe(2)
})
