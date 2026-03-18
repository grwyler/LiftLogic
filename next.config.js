// next.config.js
const packageJson = require("./package.json");

const commitSha =
  process.env.NEXT_PUBLIC_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GIT_COMMIT_SHA ||
  "";

module.exports = {
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_COMMIT_SHA: commitSha,
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || "development",
  },
  // server: {
  //   host: "0.0.0.0",
  //   port: process.env.PORT || 3000,
  // },
};
