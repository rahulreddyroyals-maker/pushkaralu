import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "node:url";

// path.dirname(new URL(...).pathname) breaks on Windows — it leaves a
// leading slash before the drive letter (e.g. "/D:/pushkaralu/src"),
// which resolves to a nonexistent path and makes every "@/..." import
// fail. fileURLToPath handles Windows/POSIX file URL conversion correctly.
const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules/**", "src/__tests__/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
});
