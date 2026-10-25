import { expect, type Page } from '@playwright/test'

export async function readMaterial(page: Page) {
  const next = page.getByRole('button', { name: 'Potwierdzam zapoznanie się z materiałem', exact: true })
  const test = page.getByRole('button', { name: 'Przejdź do testu', exact: true })
  await expect(async () => {
    if (await test.isEnabled()) return
    if (await next.isVisible()) await next.click()
    else {
      const practice = page.getByRole('group', { name: 'Wykonaj ćwiczenie' })
      if (await practice.isVisible()) {
        await practice.getByRole('radio').first().check()
        await page.getByRole('button', { name: 'Sprawdź ćwiczenie i kontynuuj', exact: true }).click()
      }
    }
    await expect(test).toBeEnabled({ timeout: 250 })
  }).toPass({ timeout: 20000, intervals: [100, 200] })
}
