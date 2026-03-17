import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("stale asset recovery", () => {
  it("reloads once when a stale Next chunk fails after a deploy", () => {
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );

    expect(appSource).toContain('const STALE_ASSET_RECOVERY_KEY = "liftlogic-stale-asset-recovery-at"');
    expect(appSource).toContain('name === "ChunkLoadError"');
    expect(appSource).toContain('message.includes("Loading chunk")');
    expect(appSource).toContain('message.includes("Failed to fetch dynamically imported module")');
    expect(appSource).toContain('message.includes("Failed to load resource")');
    expect(appSource).toContain('source.includes("/_next/static/")');
    expect(appSource).toContain('candidate.currentSrc ??');
    expect(appSource).toContain('["SCRIPT", "LINK"].includes(');
    expect(appSource).toContain('assetSource.includes("/_next/static/")');
    expect(appSource).toContain('window.location.reload()');
  });

  it("keeps transient Next build assets out of the runtime service-worker cache", () => {
    const serviceWorkerSource = fs.readFileSync(
      path.join(process.cwd(), "public", "sw.js"),
      "utf8"
    );

    expect(serviceWorkerSource).toContain('const NEXT_ASSET_PREFIX = "/_next/static/";');
    expect(serviceWorkerSource).toContain('!requestUrl.pathname.startsWith(NEXT_ASSET_PREFIX);');
  });
});
