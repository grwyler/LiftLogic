import path from "path";
import { chromium } from "playwright";
import { updates } from "./reconcileBacklogStatuses.mjs";

const LIVE_BUGS_URL = "https://lift-logic.vercel.app/bugs";

const run = async () => {
  const userDataDir = path.join(
    process.env.LOCALAPPDATA,
    "Microsoft",
    "Edge",
    "User Data"
  );

  const browser = await chromium.launchPersistentContext(userDataDir, {
    channel: "msedge",
    headless: true,
    args: ["--profile-directory=Default"],
  });

  try {
    const page = browser.pages()[0] || (await browser.newPage());
    await page.goto(LIVE_BUGS_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

    const bodyText = await page.locator("body").innerText();
    if (bodyText.includes("Sign in to view feedback work items.")) {
      throw new Error("Browser session is not signed in to the live /bugs page.");
    }

    const results = await page.evaluate(async (patches) => {
      const outcomes = [];

      for (const patch of patches) {
        const response = await fetch("/api/feedback", {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workItemId: patch.id,
            triageStatus: patch.triageStatus,
            resolution: patch.resolution,
          }),
        });

        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          responseBody = null;
        }

        outcomes.push({
          id: patch.id,
          outcome: response.ok ? "updated" : "failed",
          status: response.status,
          triageStatus: responseBody?.workItem?.triageStatus || null,
          message:
            responseBody?.message ||
            responseBody?.warnings?.join(" | ") ||
            null,
        });
      }

      return outcomes;
    }, updates);

    for (const result of results) {
      console.log(JSON.stringify(result));
    }
  } finally {
    await browser.close();
  }
};

run().catch((error) => {
  console.error("BROWSER_BACKLOG_RECONCILIATION_FAILED");
  console.error(error?.message || String(error));
  process.exitCode = 1;
});
