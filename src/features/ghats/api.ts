import { getAdminDb } from "@/lib/firebase/admin";
import { paginateQuery, timestampToIso, type PageResult } from "@/lib/pagination";
import { FieldValue, type QueryDocumentSnapshot, type DocumentData } from "firebase-admin/firestore";
import type { Ghat, GhatFacility } from "./types";
import type { GhatInput } from "./schemas";

function mapGhatDoc(eventId: string) {
  return (doc: QueryDocumentSnapshot<DocumentData>): Ghat => {
    const data = doc.data();
    return {
      id: doc.id,
      eventId,
      name: data.name,
      description: data.description,
      images: data.images ?? [],
      location: data.location,
      facilities: data.facilities ?? [],
      crowdStatus: data.crowdStatus ?? "LOW",
      crowdStatusUpdatedAt: timestampToIso(data.crowdStatusUpdatedAt),
      crowdStatusUpdatedBy: data.crowdStatusUpdatedBy ?? null,
      waitMinutes: data.waitMinutes ?? null,
      operationalStatus: data.operationalStatus ?? "UNKNOWN",
      alternativeGhatId: data.alternativeGhatId ?? null,
      statusNote: data.statusNote ?? "",
      parkingInfo: data.parkingInfo,
      medicalInfo: data.medicalInfo,
      published: data.published ?? false,
      seo: data.seo,
      createdAt: timestampToIso(data.createdAt),
      updatedAt: timestampToIso(data.updatedAt),
    };
  };
}

interface ListGhatsOptions {
  pageSize?: number;
  cursor?: string | null;
  includeUnpublished?: boolean;
  facility?: GhatFacility;
  search?: string;
}

/**
 * Two distinct query shapes rather than one query with every filter
 * combined: Firestore requires a composite index per distinct
 * (equality/array-contains + orderBy) combination, and combining
 * search + facility + published + orderBy would need an impractical
 * number of indexes for a Sprint 3 dataset. `search` and `facility` are
 * therefore mutually exclusive at the query level (search wins if both
 * are passed) — acceptable for now, documented in docs/DATABASE_SCHEMA.md.
 *
 * `search` is a prefix match on a lowercased `nameLower` field (written
 * at create/update time), not full-text search — Firestore has no native
 * full-text search. Good enough for a ghat-name lookup; revisit with
 * Algolia/Typesense if search needs grow.
 */
export async function listGhats(eventId: string, options: ListGhatsOptions = {}): Promise<PageResult<Ghat>> {
  const { pageSize = 12, cursor, includeUnpublished = false, facility, search } = options;
  const db = getAdminDb();
  const base = db.collection("events").doc(eventId).collection("ghats");

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    let query = base
      .orderBy("nameLower")
      .startAt(term)
      .endAt(term + "\uf8ff") as FirebaseFirestore.Query;
    if (!includeUnpublished) query = query.where("published", "==", true);
    const snapshot = await query.limit(pageSize).get();
    const items = snapshot.docs.map(mapGhatDoc(eventId));
    return { items, nextCursor: null }; // search results aren't paginated in Sprint 3 — small demo dataset
  }

  let query = base.orderBy("createdAt", "desc") as FirebaseFirestore.Query;
  if (!includeUnpublished) query = query.where("published", "==", true);
  if (facility) query = query.where("facilities", "array-contains", facility);

  return paginateQuery<Ghat>(query, mapGhatDoc(eventId), { pageSize, cursor });
}

export async function getGhat(eventId: string, ghatId: string, { includeUnpublished = false }: { includeUnpublished?: boolean } = {}): Promise<Ghat | null> {
  const db = getAdminDb();
  const snapshot = await db.collection("events").doc(eventId).collection("ghats").doc(ghatId).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data()!;
  if (!includeUnpublished && !data.published) return null;
  return mapGhatDoc(eventId)(snapshot as QueryDocumentSnapshot<DocumentData>);
}

export async function createGhat(eventId: string, input: GhatInput): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection("events").doc(eventId).collection("ghats").doc();
  await ref.set({
    name: input.name,
    nameLower: input.name.en.toLowerCase(),
    description: input.description,
    images: input.images,
    location: { latitude: input.latitude, longitude: input.longitude },
    facilities: input.facilities,
    crowdStatus: "LOW",
    crowdStatusUpdatedAt: FieldValue.serverTimestamp(),
    crowdStatusUpdatedBy: null,
    parkingInfo: input.parkingInfo,
    medicalInfo: input.medicalInfo,
    published: false,
    seo: { title: input.seoTitle, description: input.seoDescription, canonicalPath: input.canonicalPath },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateGhat(eventId: string, ghatId: string, input: GhatInput): Promise<void> {
  const db = getAdminDb();
  await db.collection("events").doc(eventId).collection("ghats").doc(ghatId).update({
    name: input.name,
    nameLower: input.name.en.toLowerCase(),
    description: input.description,
    images: input.images,
    location: { latitude: input.latitude, longitude: input.longitude },
    facilities: input.facilities,
    parkingInfo: input.parkingInfo,
    medicalInfo: input.medicalInfo,
    seo: { title: input.seoTitle, description: input.seoDescription, canonicalPath: input.canonicalPath },
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setGhatPublished(eventId: string, ghatId: string, published: boolean): Promise<void> {
  const db = getAdminDb();
  await db.collection("events").doc(eventId).collection("ghats").doc(ghatId).update({
    published,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteGhat(eventId: string, ghatId: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("events").doc(eventId).collection("ghats").doc(ghatId).delete();
}

/** Persists one manual crowd report. `patch` holds only the fields to change (null clears). Records who/when — the "Updated X ago, by staff" requirement (spec Module 3). */
export async function updateCrowdStatus(eventId: string, ghatId: string, patch: Record<string, unknown>, updatedBy: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("events").doc(eventId).collection("ghats").doc(ghatId).update({
    ...patch,
    crowdStatusUpdatedAt: FieldValue.serverTimestamp(),
    crowdStatusUpdatedBy: updatedBy,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
