import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env.CI);
// the playground's port (vite.config.ts reads the same variable)
const PORT = Number(process.env.PLAYGROUND_PORT ?? 5173);

export default defineConfig({
    testDir: "e2e",
    fullyParallel: true,
    forbidOnly: CI,
    retries: CI ? 2 : 0,
    // pointer and focus timing is sensitive to a contended dev server: few workers in CI
    workers: CI ? 2 : 4,
    reporter: CI ? [["line"], ["html", { open: "never" }]] : "line",
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
            testIgnore: /\.touch\.spec\.ts$/,
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
            testIgnore: /\.touch\.spec\.ts$/,
        },
        // a phone: real touch input (Chromium's), for the specs written for it
        {
            name: "touch",
            use: { ...devices["Pixel 7"] },
            testMatch: /\.touch\.spec\.ts$/,
        },
    ],
    webServer: {
        command: "pnpm dev",
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !CI,
    },
});
