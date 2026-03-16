import type { CapacitorConfig } from "@capacitor/cli";

const defaultProductionUrl = "https://liftlogic.vercel.app";
const serverUrl = String(
  process.env.CAPACITOR_SERVER_URL || defaultProductionUrl
).trim();
const isLocalServer =
  serverUrl.startsWith("http://localhost") ||
  serverUrl.startsWith("http://127.0.0.1") ||
  serverUrl.startsWith("http://10.") ||
  serverUrl.startsWith("http://192.168.") ||
  serverUrl.startsWith("http://172.");

const config: CapacitorConfig = {
  appId: "com.liftlogic.app",
  appName: "Lift Logic",
  webDir: "public/capacitor-shell",
  android: {
    path: "android",
  },
  server: {
    url: serverUrl,
    androidScheme: "https",
    cleartext: isLocalServer,
    allowNavigation: [
      "liftlogic.vercel.app",
      "*.vercel.app",
      "localhost",
      "10.*",
      "172.*",
      "192.168.*",
    ],
  },
};

export default config;
