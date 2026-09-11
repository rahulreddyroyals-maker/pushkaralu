import { getAdminDb } from "@/lib/firebase/admin";
import { paginateQuery, timestampToIso, type PageResult } from "@/lib/pagination";
import { FieldValue, type QueryDocumentSnapshot, type DocumentData } from "firebase-admin/firestore";
import type { Ritual, RitualCategory } from "./types";
import type { RitualInput } from "./schemas";

function mapRitualDoc(doc: QueryDocumentSnapshot<DocumentData>): Ritual {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    category: data.category,
    typicalDurationMinutes: data.typicalDurationMinutes ?? 0,
    indicativePriceMin: data.indicativePriceMin ?? 0,
    indicativePriceMax: data.indicativePriceMax ?? 0,
    published: data.published ?? false,
    seo: data.seo,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export async function listRituals(
  { pageSize = 24, cursor, includeUnpublished = false, category }: { pageSize?: number; cursor?: string | null; includeUnpublished?: boolean; category?: RitualCategory } = {}
): Promise<PageResult<Ritual>> {
  const db = getAdminDb();
  let query = db.collection("rituals").orderBy("createdAt", "desc") as FirebaseFirestore.Query;
  if (!includeUnpublished) query = query.where("published", "==", true);
  if (category) query = query.where("category", "==", category);
  return paginateQuery<Ritual>(query, mapRitualDoc, { pageSize, cursor });
}

export async function getRitual(id: string, { includeUnpublished = false }: { includeUnpublished?: boolean } = {}): Promise<Ritual | null> {
  const db = getAdminDb();
  const snapshot = await db.collection("rituals").doc(id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data()!;
  if (!includeUnpublished && !data.published) return null;
  return mapRitualDoc(snapshot as QueryDocumentSnapshot<DocumentData>);
}

/** Fetches multiple rituals by ID in one round trip — used on Purohit detail pages to resolve their ritualIds[]. Firestore getAll() handles the batching. */
export async function getRitualsByIds(ids: string[]): Promise<Ritual[]> {
  if (ids.length === 0) return [];
  const db = getAdminDb();
  const refs = ids.map((id) => db.collection("rituals").doc(id));
  const snapshots = await db.getAll(...refs);
  return snapshots.filter((s) => s.exists && s.data()?.published).map((s) => mapRitualDoc(s as QueryDocumentSnapshot<DocumentData>));
}

export async function createRitual(input: RitualInput): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection("rituals").doc();
  await ref.set({
    name: input.name,
    description: input.description,
    category: input.category,
    typicalDurationMinutes: input.typicalDurationMinutes,
    indicativePriceMin: input.indicativePriceMin,
    indicativePriceMax: input.indicativePriceMax,
    published: false,
    seo: { title: input.seoTitle, description: input.seoDescription, canonicalPath: input.canonicalPath },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateRitual(id: string, input: RitualInput): Promise<void> {
  const db = getAdminDb();
  await db.collection("rituals").doc(id).update({
    name: input.name,
    description: input.description,
    category: input.category,
    typicalDurationMinutes: input.typicalDurationMinutes,
    indicativePriceMin: input.indicativePriceMin,
    indicativePriceMax: input.indicativePriceMax,
    seo: { title: input.seoTitle, description: input.seoDescription, canonicalPath: input.canonicalPath },
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setRitualPublished(id: string, published: boolean): Promise<void> {
  const db = getAdminDb();
  await db.collection("rituals").doc(id).update({ published, updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteRitual(id: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("rituals").doc(id).delete();
}
