import { defineConfig } from "vitest/config";

/**
 * Separate from vitest.config.mts on purpose: this suite requires a live
 * Firestore emulator on localhost:8080 (see firebase.json). Run it with:
 *   firebase emulators:exec --only firestore "npm run test:rules"
 * It is NOT part of the default `npm test` run, since that would fail/hang
 * in any environment without the emulator already running.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
