import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env.CI);
// the specs written for a phone: real touch input, a phone's viewport
const MOBILE = /(\.touch|mobile)\.spec\.ts$/;
// WebKit on an iPhone's viewport: its own CI job, never blocking (`PLAYWRIGHT_WEBKIT=1`)
const WEBKIT = process.env.PLAYWRIGHT_WEBKIT === "1";
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
            testIgnore: MOBILE,
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
            testIgnore: MOBILE,
        },
        // a phone: real touch input (Chromium's, through the DevTools protocol)
        {
            name: "mobile",
            use: { ...devices["Pixel 7"] },
            testMatch: MOBILE,
        },
        ...(WEBKIT
            ? [
                  {
                      name: "webkit-mobile",
                      use: { ...devices["iPhone 15"] },
                      testMatch: MOBILE,
                  },
              ]
            : []),
    ],
    webServer: {
        command: "pnpm dev",
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !CI,
    },
});
