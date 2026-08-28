/**
 * Firestore Security Rules tests — run against the LOCAL Firebase emulator.
 *
 * IMPORTANT: this suite cannot be executed inside the sandbox that
 * generated this codebase. `firebase emulators:start` downloads a Java
 * emulator binary from Google Cloud Storage, and that sandbox's network
 * allowlist blocks all Google domains (confirmed: googleapis.com and
 * storage.googleapis.com both return 403). This is disclosed here rather
 * than silently shipping an untested-but-claimed-tested file.
 *
 * To actually run this on your machine:
 *   1. npm install -g firebase-tools  (or use npx)
 *   2. firebase emulators:exec --only firestore "npx vitest run src/__tests__/firestore.rules.test.ts"
 *
 * The unauthorized-access scenarios below mirror the ones already
 * verified (and passing) against the application-layer guards in
 * src/lib/auth/guards.test.ts and the role-assignment route handler in
 * src/app/api/admin/users/[uid]/role/route.test.ts — this file is the
 * third, data-layer leg of the same authorization model, so all three
 * layers agree with each other by construction, not just by review.
 */
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "pushkaralu-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("users/{uid} rules", () => {
  it("denies a signed-in user reading someone else's profile", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/other-uid"), { role: "USER" });
    });
    const alice = testEnv.authenticatedContext("alice-uid", { role: "USER" });
    await assertFails(getDoc(doc(alice.firestore(), "users/other-uid")));
  });

  it("allows a user to read their own profile", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice-uid"), { role: "USER" });
    });
    const alice = testEnv.authenticatedContext("alice-uid", { role: "USER" });
    await assertSucceeds(getDoc(doc(alice.firestore(), "users/alice-uid")));
  });

  it("denies a user writing their own role field directly — the core 'never trust client-provided roles' rule", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice-uid"), { role: "USER", displayName: "Alice" });
    });
    const alice = testEnv.authenticatedContext("alice-uid", { role: "USER" });
    await assertFails(updateDoc(doc(alice.firestore(), "users/alice-uid"), { role: "SUPER_ADMIN" }));
  });

  it("allows a user to update non-role fields on their own profile", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice-uid"), { role: "USER", displayName: "Alice" });
    });
    const alice = testEnv.authenticatedContext("alice-uid", { role: "USER" });
    await assertSucceeds(updateDoc(doc(alice.firestore(), "users/alice-uid"), { displayName: "Alicia" }));
  });

  it("denies even an ADMIN from changing the role field via a direct document write (must use the audited API route)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice-uid"), { role: "USER" });
    });
    const admin = testEnv.authenticatedContext("admin-uid", { role: "ADMIN" });
    await assertFails(updateDoc(doc(admin.firestore(), "users/alice-uid"), { role: "PUROHIT" }));
  });

  it("denies an unauthenticated client from reading any profile", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice-uid"), { role: "USER" });
    });
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "users/alice-uid")));
  });
});

describe("auditLogs/{id} rules", () => {
  it("denies ALL client writes, even from SUPER_ADMIN — audit logs are server-only", async () => {
    const superAdmin = testEnv.authenticatedContext("root-uid", { role: "SUPER_ADMIN" });
    await assertFails(setDoc(doc(superAdmin.firestore(), "auditLogs/entry-1"), { action: "TEST" }));
  });

  it("allows ADMIN to read audit logs", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "auditLogs/entry-1"), { action: "ROLE_ASSIGNED" });
    });
    const admin = testEnv.authenticatedContext("admin-uid", { role: "ADMIN" });
    await assertSucceeds(getDoc(doc(admin.firestore(), "auditLogs/entry-1")));
  });

  it("denies a plain USER from reading audit logs", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "auditLogs/entry-1"), { action: "ROLE_ASSIGNED" });
    });
    const user = testEnv.authenticatedContext("user-uid", { role: "USER" });
    await assertFails(getDoc(doc(user.firestore(), "auditLogs/entry-1")));
  });
});

describe("hotels/{id} — provider-owned listing rules", () => {
  it("denies a HOTEL_OWNER editing another owner's hotel listing", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "hotels/hotel-1"), { ownerId: "owner-a", name: "River View" });
    });
    const ownerB = testEnv.authenticatedContext("owner-b", { role: "HOTEL_OWNER" });
    await assertFails(updateDoc(doc(ownerB.firestore(), "hotels/hotel-1"), { name: "Hijacked" }));
  });

  it("allows a HOTEL_OWNER editing their own listing", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "hotels/hotel-1"), { ownerId: "owner-a", name: "River View" });
    });
    const ownerA = testEnv.authenticatedContext("owner-a", { role: "HOTEL_OWNER" });
    await assertSucceeds(updateDoc(doc(ownerA.firestore(), "hotels/hotel-1"), { name: "River View Deluxe" }));
  });

  it("allows anyone (even unauthenticated) to read a hotel listing — public directory content", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "hotels/hotel-1"), { ownerId: "owner-a", name: "River View" });
    });
    const anon = testEnv.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(anon.firestore(), "hotels/hotel-1")));
  });
});

describe("events/{id}/ghats — crowd status moderation", () => {
  it("denies a plain USER from updating crowd status", async () => {
    const user = testEnv.authenticatedContext("user-uid", { role: "USER" });
    await assertFails(
      setDoc(doc(user.firestore(), "events/ev1/ghats/ghat1"), { crowdStatus: "CRITICAL" })
    );
  });

  it("allows a MODERATOR to update crowd status", async () => {
    const moderator = testEnv.authenticatedContext("mod-uid", { role: "MODERATOR" });
    await assertSucceeds(
      setDoc(doc(moderator.firestore(), "events/ev1/ghats/ghat1"), { crowdStatus: "HIGH" })
    );
  });
});
