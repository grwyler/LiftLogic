import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

describe("workout app shell bundle split", () => {
  it("removes the global bootstrap stylesheet from the shared app shell", () => {
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "_app.tsx"),
      "utf8"
    );
    const imageGeneratorSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "imageGenerator.tsx"),
      "utf8"
    );
    const editWorkoutSource = fs.readFileSync(
      path.join(process.cwd(), "pages", "editWorkout", "[id].tsx"),
      "utf8"
    );

    expect(appSource).not.toContain('bootstrap/dist/css/bootstrap.min.css');
    expect(imageGeneratorSource).toContain("TextField");
    expect(editWorkoutSource).not.toContain("react-bootstrap");
  });
});
