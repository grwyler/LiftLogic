import { defineConfig, devices } from "@playwright/test";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const useLocalWebServer = /^https?:\/\/127\.0\.0\.1:3001$/i.test(baseURL);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    viewport: { width: 1280, height: 900 },
    launchOptions: {
      executablePath: chromePath,
    },
  },
  webServer: useLocalWebServer
    ? {
        command: "cmd.exe /c npm run start -- -p 3001",
        url: "http://127.0.0.1:3001",
        reuseExistingServer: true,
        timeout: 120_000,
        cwd: ".",
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
