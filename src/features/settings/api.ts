import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { timestampToIso } from "@/lib/pagination";
import { DEFAULT_MONETIZATION_SETTINGS, type MonetizationSettings } from "./types";
import type { MonetizationSettingsInput } from "./schemas";

const SETTINGS_DOC_PATH = "monetization";

/**
 * Falls back to DEFAULT_MONETIZATION_SETTINGS only when the document
 * genuinely doesn't exist yet — see that constant's comment for why this
 * isn't the same thing as hardcoding a commission rate in business logic.
 */
export async function getMonetizationSettings(): Promise<MonetizationSettings> {
  const db = getAdminDb();
  const snapshot = await db.collection("settings").doc(SETTINGS_DOC_PATH).get();
  if (!snapshot.exists) {
    return { ...DEFAULT_MONETIZATION_SETTINGS, updatedAt: new Date(0).toISOString() };
  }
  const data = snapshot.data()!;
  return {
    bookingCommissionPercent: data.bookingCommissionPercent ?? DEFAULT_MONETIZATION_SETTINGS.bookingCommissionPercent,
    leadFee: data.leadFee ?? DEFAULT_MONETIZATION_SETTINGS.leadFee,
    featuredListingPrice: data.featuredListingPrice ?? DEFAULT_MONETIZATION_SETTINGS.featuredListingPrice,
    sponsoredListingPrice: data.sponsoredListingPrice ?? DEFAULT_MONETIZATION_SETTINGS.sponsoredListingPrice,
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export async function updateMonetizationSettings(input: MonetizationSettingsInput): Promise<void> {
  const db = getAdminDb();
  await db.collection("settings").doc(SETTINGS_DOC_PATH).set(
    { ...input, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
}
