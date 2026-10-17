import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config'

// Engine-level checks supplement responsive Chromium tests. This is WebKit
// emulation, not a claim of certification on physical Apple devices.
export default defineConfig({
  ...base,
  projects: [
    { name: 'safari-webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
    { name: 'ipad-webkit', use: { ...devices['iPad Pro 11'] } },
  ],
})
