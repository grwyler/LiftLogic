import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("app shell hydration deferral", () => {
  it("defers non-essential global helpers until after first paint", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );

    expect(source).toContain("const [deferredShellReady, setDeferredShellReady] = useState(false);");
    expect(source).toContain("setDeferredShellReady(true)");
    expect(source).toContain("{deferredShellReady ? (");
    expect(source).toContain("<AutomaticBugReporter />");
    expect(source).toContain("<ToastContainer");
  });
});
