import { getAdminDb } from "@/lib/firebase/admin";
import { paginateQuery, timestampToIso, type PageResult } from "@/lib/pagination";
import { FieldValue, type QueryDocumentSnapshot, type DocumentData } from "firebase-admin/firestore";
import type { Purohit } from "./types";
import type { PurohitInput } from "./schemas";

function mapPurohitDoc(doc: QueryDocumentSnapshot<DocumentData>): Purohit {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    name: data.name,
    bio: data.bio,
    photo: data.photo ?? null,
    languages: data.languages ?? [],
    experienceYears: data.experienceYears ?? 0,
    location: data.location,
    address: data.address,
    contactPhone: data.contactPhone,
    ritualIds: data.ritualIds ?? [],
    pricingNote: data.pricingNote,
    availabilityNote: data.availabilityNote,
    approvalStatus: data.approvalStatus ?? "PENDING",
    seo: data.seo,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

interface ListPurohitsOptions {
  pageSize?: number;
  cursor?: string | null;
  includeUnverified?: boolean;
  language?: string;
  ritualId?: string;
  search?: string;
  ownerId?: string;
}

export async function listPurohits(options: ListPurohitsOptions = {}): Promise<PageResult<Purohit>> {
  const { pageSize = 12, cursor, includeUnverified = false, language, ritualId, search, ownerId } = options;
  const db = getAdminDb();
  const base = db.collection("purohits");

  if (ownerId) {
    const snapshot = await base.where("userId", "==", ownerId).orderBy("createdAt", "desc").limit(pageSize).get();
    return { items: snapshot.docs.map(mapPurohitDoc), nextCursor: null };
  }

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    let query = base.orderBy("nameLower").startAt(term).endAt(term + "\uf8ff") as FirebaseFirestore.Query;
    if (!includeUnverified) query = query.where("approvalStatus", "==", "VERIFIED");
    const snapshot = await query.limit(pageSize).get();
    return { items: snapshot.docs.map(mapPurohitDoc), nextCursor: null };
  }

  let query = base.orderBy("createdAt", "desc") as FirebaseFirestore.Query;
  if (!includeUnverified) query = query.where("approvalStatus", "==", "VERIFIED");
  if (ritualId) query = query.where("ritualIds", "array-contains", ritualId);
  else if (language) query = query.where("languages", "array-contains", language);

  return paginateQuery<Purohit>(query, mapPurohitDoc, { pageSize, cursor });
}

export async function getPurohit(id: string, { includeUnverified = false }: { includeUnverified?: boolean } = {}): Promise<Purohit | null> {
  const db = getAdminDb();
  const snapshot = await db.collection("purohits").doc(id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data()!;
  if (!includeUnverified && data.approvalStatus !== "VERIFIED") return null;
  return mapPurohitDoc(snapshot as QueryDocumentSnapshot<DocumentData>);
}

export async function createPurohit(userId: string, input: PurohitInput): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection("purohits").doc();
  await ref.set({
    userId,
    name: input.name,
    nameLower: input.name.en.toLowerCase(),
    bio: input.bio,
    photo: input.photo || null,
    languages: input.languages,
    experienceYears: input.experienceYears,
    location: { latitude: input.latitude, longitude: input.longitude },
    address: input.address,
    contactPhone: input.contactPhone,
    ritualIds: input.ritualIds,
    pricingNote: input.pricingNote,
    availabilityNote: input.availabilityNote,
    approvalStatus: "PENDING",
    seo: { title: input.seoTitle, description: input.seoDescription, canonicalPath: input.canonicalPath },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updatePurohit(id: string, input: PurohitInput): Promise<void> {
  const db = getAdminDb();
  await db.collection("purohits").doc(id).update({
    name: input.name,
    nameLower: input.name.en.toLowerCase(),
    bio: input.bio,
    photo: input.photo || null,
    languages: input.languages,
    experienceYears: input.experienceYears,
    location: { latitude: input.latitude, longitude: input.longitude },
    address: input.address,
    contactPhone: input.contactPhone,
    ritualIds: input.ritualIds,
    pricingNote: input.pricingNote,
    availabilityNote: input.availabilityNote,
    seo: { title: input.seoTitle, description: input.seoDescription, canonicalPath: input.canonicalPath },
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setPurohitApproval(id: string, approvalStatus: Purohit["approvalStatus"]): Promise<void> {
  const db = getAdminDb();
  await db.collection("purohits").doc(id).update({ approvalStatus, updatedAt: FieldValue.serverTimestamp() });
}

export async function deletePurohit(id: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("purohits").doc(id).delete();
}

/** Purohits offering a given ritual — used on the ritual detail page. */
export async function listPurohitsByRitual(ritualId: string, pageSize = 6): Promise<Purohit[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection("purohits")
    .where("approvalStatus", "==", "VERIFIED")
    .where("ritualIds", "array-contains", ritualId)
    .limit(pageSize)
    .get();
  return snapshot.docs.map(mapPurohitDoc);
}
