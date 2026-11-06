import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

// Scroll snapping and scroll events need a real layout engine, so every test
// runs in a browser. Locally only Chromium, for speed; CI runs all three.
const browsers = process.env.CI
  ? (["chromium", "firefox", "webkit"] as const)
  : (["chromium"] as const)

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: browsers.map((browser) => ({ browser })),
    },
  },
})
