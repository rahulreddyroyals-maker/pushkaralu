import { getAdminDb } from "@/lib/firebase/admin";
import { paginateQuery, timestampToIso, type PageResult } from "@/lib/pagination";
import { FieldValue, type QueryDocumentSnapshot, type DocumentData } from "firebase-admin/firestore";
import type { Business, BusinessCategory } from "./types";
import type { BusinessInput } from "./schemas";

function mapBusinessDoc(doc: QueryDocumentSnapshot<DocumentData>): Business {
  const data = doc.data();
  return {
    id: doc.id,
    ownerId: data.ownerId,
    category: data.category,
    name: data.name,
    description: data.description,
    images: data.images ?? [],
    address: data.address,
    location: data.location,
    contactPhone: data.contactPhone,
    pricingNote: data.pricingNote,
    approvalStatus: data.approvalStatus ?? "PENDING",
    seo: data.seo,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

interface ListBusinessesOptions {
  pageSize?: number;
  cursor?: string | null;
  includeUnverified?: boolean;
  /** Accepts multiple categories (e.g. Travel page shows taxi + travel_operator together) via Firestore's `in` operator. */
  category?: BusinessCategory | BusinessCategory[];
  search?: string;
  ownerId?: string;
}

export async function listBusinesses(options: ListBusinessesOptions = {}): Promise<PageResult<Business>> {
  const { pageSize = 12, cursor, includeUnverified = false, category, search, ownerId } = options;
  const db = getAdminDb();
  const base = db.collection("businesses");
  const categories = category ? (Array.isArray(category) ? category : [category]) : undefined;

  if (ownerId) {
    const snapshot = await base.where("ownerId", "==", ownerId).orderBy("createdAt", "desc").limit(pageSize).get();
    return { items: snapshot.docs.map(mapBusinessDoc), nextCursor: null };
  }

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    let query = base.orderBy("nameLower").startAt(term).endAt(term + "\uf8ff") as FirebaseFirestore.Query;
    if (!includeUnverified) query = query.where("approvalStatus", "==", "VERIFIED");
    if (categories) query = query.where("category", "in", categories);
    const snapshot = await query.limit(pageSize).get();
    return { items: snapshot.docs.map(mapBusinessDoc), nextCursor: null };
  }

  let query = base.orderBy("createdAt", "desc") as FirebaseFirestore.Query;
  if (!includeUnverified) query = query.where("approvalStatus", "==", "VERIFIED");
  if (categories) query = query.where("category", "in", categories);

  return paginateQuery<Business>(query, mapBusinessDoc, { pageSize, cursor });
}

export async function getBusiness(id: string, { includeUnverified = false }: { includeUnverified?: boolean } = {}): Promise<Business | null> {
  const db = getAdminDb();
  const snapshot = await db.collection("businesses").doc(id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data()!;
  if (!includeUnverified && data.approvalStatus !== "VERIFIED") return null;
  return mapBusinessDoc(snapshot as QueryDocumentSnapshot<DocumentData>);
}

export async function createBusiness(ownerId: string, input: BusinessInput): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection("businesses").doc();
  await ref.set({
    ownerId,
    category: input.category,
    name: input.name,
    nameLower: input.name.en.toLowerCase(),
    description: input.description,
    images: input.images,
    address: input.address,
    location: { latitude: input.latitude, longitude: input.longitude },
    contactPhone: input.contactPhone,
    pricingNote: input.pricingNote,
    approvalStatus: "PENDING",
    seo: { title: input.seoTitle, description: input.seoDescription, canonicalPath: input.canonicalPath },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateBusiness(id: string, input: BusinessInput): Promise<void> {
  const db = getAdminDb();
  await db.collection("businesses").doc(id).update({
    category: input.category,
    name: input.name,
    nameLower: input.name.en.toLowerCase(),
    description: input.description,
    images: input.images,
    address: input.address,
    location: { latitude: input.latitude, longitude: input.longitude },
    contactPhone: input.contactPhone,
    pricingNote: input.pricingNote,
    seo: { title: input.seoTitle, description: input.seoDescription, canonicalPath: input.canonicalPath },
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setBusinessApproval(id: string, approvalStatus: Business["approvalStatus"]): Promise<void> {
  const db = getAdminDb();
  await db.collection("businesses").doc(id).update({ approvalStatus, updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteBusiness(id: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("businesses").doc(id).delete();
}
