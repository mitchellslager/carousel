import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  // oxc emits declarations without the TypeScript compiler. It requires
  // isolatedDeclarations-compatible code: explicit types on every export.
  dts: { generator: "oxc" },
  clean: true,
  copy: [{ from: "src/styles.css", to: "dist" }],
})
