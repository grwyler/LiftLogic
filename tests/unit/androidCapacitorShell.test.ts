import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("android capacitor shell", () => {
  it("keeps a remote-hosted Capacitor config for the Android wrapper", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "capacitor.config.ts"),
      "utf8"
    );

    expect(source).toContain('const defaultProductionUrl = "https://liftlogic.vercel.app"');
    expect(source).toContain('webDir: "public/capacitor-shell"');
    expect(source).toContain("server: {");
    expect(source).toContain("url: serverUrl");
    expect(source).toContain('androidScheme: "https"');
    expect(source).toContain("cleartext: isLocalServer");
  });

  it("documents the Android shell workflow and exposes helper scripts", () => {
    const packageSource = fs.readFileSync(
      path.join(process.cwd(), "package.json"),
      "utf8"
    );
    const docsSource = fs.readFileSync(
      path.join(process.cwd(), "docs", "android-capacitor-shell.md"),
      "utf8"
    );

    expect(packageSource).toContain('"android:sync": "npx cap sync android"');
    expect(packageSource).toContain('"android:open": "npx cap open android"');
    expect(packageSource).toContain('"android:run": "npx cap run android"');
    expect(docsSource).toContain("https://liftlogic.vercel.app");
    expect(docsSource).toContain("$env:CAPACITOR_SERVER_URL");
    expect(docsSource).toContain("npm run android:sync");
    expect(docsSource).toContain("npm run android:open");
  });
});
