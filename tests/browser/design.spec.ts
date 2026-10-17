import { test, expect } from '@playwright/test'

test('home previews different ways to learn and opens the existing lesson', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Zrozum więcej. Po swojemu.' })).toBeVisible()
  await page.getByRole('button', { name: 'Schemat', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Interaktywny schemat komunikacji' })).toBeVisible()
  await page.getByRole('button', { name: 'Serwer', exact: true }).click()
  await expect(page.getByText(/Obsługuje żądanie i zwraca zasoby/)).toBeVisible()
  await page.getByRole('button', { name: 'Audio', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Posłuchaj wyjaśnienia' })).toBeVisible()
  await page.getByRole('button', { name: 'Tekst', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Od nazwy do adresu.' })).toBeVisible()
  await page.getByRole('link', { name: /Rozpocznij lub wznów/ }).click()
  await expect(page.getByRole('heading', { name: 'Co już wiesz?' })).toBeVisible()
})

test('system appearance, compact layout and reduced motion remain usable', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).colorScheme)).toContain('dark')
  const contrast = await page.getByRole('link', { name: 'Dodaj swój materiał', exact: true }).evaluate(el => {
    const style = getComputedStyle(el)
    const luminance = (color: string) => {
      const values = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(n => n / 255)
      const linear = values.map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4)
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
    }
    const foreground = luminance(style.color), background = luminance(style.backgroundColor)
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
  })
  expect(contrast).toBeGreaterThanOrEqual(4.5)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('link', { name: /Rozpocznij lub wznów/ }).click()
  await expect(page.getByRole('heading', { name: 'Co już wiesz?' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
