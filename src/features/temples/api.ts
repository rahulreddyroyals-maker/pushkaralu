import { getAdminDb } from "@/lib/firebase/admin";
import { paginateQuery, timestampToIso, type PageResult } from "@/lib/pagination";
import { FieldValue, type QueryDocumentSnapshot, type DocumentData } from "firebase-admin/firestore";
import type { Temple } from "./types";
import type { TempleInput } from "./schemas";

function mapTempleDoc(doc: QueryDocumentSnapshot<DocumentData>): Temple {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    history: data.history,
    timings: data.timings,
    location: data.location,
    address: data.address,
    images: data.images ?? [],
    nearbyAttractions: data.nearbyAttractions ?? [],
    published: data.published ?? false,
    seo: data.seo,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

interface ListTemplesOptions {
  pageSize?: number;
  cursor?: string | null;
  includeUnpublished?: boolean;
  search?: string;
}

/** Same prefix-search-vs-paginated-browse split as ghats/api.ts — see the comment there for why. */
export async function listTemples(options: ListTemplesOptions = {}): Promise<PageResult<Temple>> {
  const { pageSize = 12, cursor, includeUnpublished = false, search } = options;
  const db = getAdminDb();
  const base = db.collection("temples");

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    let query = base.orderBy("nameLower").startAt(term).endAt(term + "\uf8ff") as FirebaseFirestore.Query;
    if (!includeUnpublished) query = query.where("published", "==", true);
    const snapshot = await query.limit(pageSize).get();
    return { items: snapshot.docs.map(mapTempleDoc), nextCursor: null };
  }

  let query = base.orderBy("createdAt", "desc") as FirebaseFirestore.Query;
  if (!includeUnpublished) query = query.where("published", "==", true);
  return paginateQuery<Temple>(query, mapTempleDoc, { pageSize, cursor });
}

export async function getTemple(id: string, { includeUnpublished = false }: { includeUnpublished?: boolean } = {}): Promise<Temple | null> {
  const db = getAdminDb();
  const snapshot = await db.collection("temples").doc(id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data()!;
  if (!includeUnpublished && !data.published) return null;
  return mapTempleDoc(snapshot as QueryDocumentSnapshot<DocumentData>);
}

export async function createTemple(input: TempleInput): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection("temples").doc();
  await ref.set({
    name: input.name,
    nameLower: input.name.en.toLowerCase(),
    description: input.description,
    history: input.history,
    timings: input.timings,
    location: { latitude: input.latitude, longitude: input.longitude },
    address: input.address,
    images: input.images,
    nearbyAttractions: input.nearbyAttractions,
    published: false,
    seo: { title: input.seoTitle, description: input.seoDescription, canonicalPath: input.canonicalPath },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateTemple(id: string, input: TempleInput): Promise<void> {
  const db = getAdminDb();
  await db.collection("temples").doc(id).update({
    name: input.name,
    nameLower: input.name.en.toLowerCase(),
    description: input.description,
    history: input.history,
    timings: input.timings,
    location: { latitude: input.latitude, longitude: input.longitude },
    address: input.address,
    images: input.images,
    nearbyAttractions: input.nearbyAttractions,
    seo: { title: input.seoTitle, description: input.seoDescription, canonicalPath: input.canonicalPath },
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setTemplePublished(id: string, published: boolean): Promise<void> {
  const db = getAdminDb();
  await db.collection("temples").doc(id).update({ published, updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteTemple(id: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("temples").doc(id).delete();
}
