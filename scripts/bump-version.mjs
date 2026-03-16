#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const requestedKind = String(process.argv[2] ?? process.env.RELEASE_KIND ?? "")
  .trim()
  .toLowerCase();

const normalizedKind =
  requestedKind === "feature" || requestedKind === "major"
    ? "major"
    : requestedKind === "bug" ||
        requestedKind === "bugfix" ||
        requestedKind === "fix" ||
        requestedKind === "minor"
      ? "minor"
      : "";

if (!normalizedKind) {
  console.error(
    'Usage: node scripts/bump-version.mjs <feature|bugfix|major|minor>'
  );
  process.exit(1);
}

execFileSync("npm", ["version", normalizedKind, "--no-git-tag-version"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
