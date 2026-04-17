import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3001)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 1,
  workers: 4,
  reporter: process.env.CI ? 'github' : [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.003,
      animations: 'disabled',
      caret: 'hide',
    },
    timeout: 10_000,
  },

  webServer: process.env.PLAYWRIGHT_NO_WEBSERVER
    ? undefined
    : {
        command: `PORT=${PORT} npm run dev`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },

  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-iphone-13',
      use: { ...devices['iPhone 13'] },
      testIgnore: /baseline\.spec\.ts/,
    },
    {
      name: 'mobile-iphone-se',
      use: { ...devices['iPhone SE'] },
      testIgnore: /baseline\.spec\.ts/,
    },
    {
      name: 'mobile-galaxy-s21',
      use: { ...devices['Galaxy S9+'], viewport: { width: 360, height: 800 } },
      testIgnore: /baseline\.spec\.ts/,
    },
  ],
})
