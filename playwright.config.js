import { defineConfig, devices } from '@playwright/test'

const PORT = 8123
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    // Runners de CI e máquinas carregadas sobem o browser em ~15s; os padrões
    // de 5s/30s estouram antes do render e produzem falhas intermitentes.
    timeout: 60_000,
    expect: { timeout: 15_000 },
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['list']] : [['list']],
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: 'node tests/server.mjs',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
    },
})
