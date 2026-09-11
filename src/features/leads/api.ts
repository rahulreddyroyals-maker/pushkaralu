import { getAdminDb } from "@/lib/firebase/admin";
import { timestampToIso } from "@/lib/pagination";
import { FieldValue, type QueryDocumentSnapshot, type DocumentData } from "firebase-admin/firestore";
import type { Lead, LeadStatus } from "./types";
import type { LeadInput } from "./schemas";

function mapLeadDoc(doc: QueryDocumentSnapshot<DocumentData>): Lead {
  const data = doc.data();
  return {
    id: doc.id,
    providerId: data.providerId,
    providerType: data.providerType,
    userId: data.userId,
    userDisplayName: data.userDisplayName,
    userContactPhone: data.userContactPhone,
    message: data.message,
    status: data.status ?? "NEW",
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export async function createLead(
  userId: string,
  userDisplayName: string,
  input: LeadInput
): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection("leads").doc();
  await ref.set({
    providerId: input.providerId,
    providerType: input.providerType,
    userId,
    userDisplayName,
    userContactPhone: input.userContactPhone,
    message: input.message,
    status: "NEW",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/** A provider's own leads — provider dashboard "Inquiries" view. */
export async function listLeadsForProvider(providerId: string, pageSize = 50): Promise<Lead[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection("leads")
    .where("providerId", "==", providerId)
    .orderBy("createdAt", "desc")
    .limit(pageSize)
    .get();
  return snapshot.docs.map(mapLeadDoc);
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<void> {
  const db = getAdminDb();
  await db.collection("leads").doc(id).update({ status, updatedAt: FieldValue.serverTimestamp() });
}
