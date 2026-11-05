import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Paylaşılan paket TypeScript kaynağı olarak tüketiliyor; derlemeye dahil et.
  noExternal: ["@gorev/shared"],
});
