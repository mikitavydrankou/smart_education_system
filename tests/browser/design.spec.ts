import { test, expect } from '@playwright/test'

test('catalog introduces the platform and keeps the example lesson accessible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dostępne przedmioty', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Przedmioty', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Zarejestruj się', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Przykładowa lekcja', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Co już wiesz?' })).toBeVisible()
})

test('portal navigation adapts between sidebar and mobile menu', async ({ page }) => {
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: 'Nawigacja platformy' })
  if ((page.viewportSize()?.width ?? 0) < 1000) {
    const toggle = page.getByRole('button', { name: 'Menu nawigacji', exact: true })
    await expect(navigation).toBeHidden()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(navigation).toBeVisible()
    await navigation.getByRole('link', { name: 'Przedmioty', exact: true }).click()
    await expect(navigation).toBeHidden()
  } else {
    await expect(navigation).toBeVisible()
    await expect(navigation.getByRole('link', { name: 'Przedmioty', exact: true })).toHaveAttribute('aria-current', 'page')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('catalog remains usable in dark appearance and on compact screens', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  expect(await page.locator('html').evaluate(element => getComputedStyle(element).colorScheme)).toContain('dark')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('link', { name: 'Przykładowa lekcja', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Co już wiesz?' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
