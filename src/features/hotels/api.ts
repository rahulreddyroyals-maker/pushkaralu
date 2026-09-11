import { getAdminDb } from "@/lib/firebase/admin";
import { paginateQuery, timestampToIso, type PageResult } from "@/lib/pagination";
import { FieldValue, type QueryDocumentSnapshot, type DocumentData } from "firebase-admin/firestore";
import type { Hotel, HotelAmenity } from "./types";
import type { HotelInput } from "./schemas";

function mapHotelDoc(doc: QueryDocumentSnapshot<DocumentData>): Hotel {
  const data = doc.data();
  return {
    id: doc.id,
    ownerId: data.ownerId,
    name: data.name,
    description: data.description,
    images: data.images ?? [],
    address: data.address,
    location: data.location,
    contactPhone: data.contactPhone,
    amenities: data.amenities ?? [],
    priceRangeMin: data.priceRangeMin ?? 0,
    priceRangeMax: data.priceRangeMax ?? 0,
    policies: data.policies,
    approvalStatus: data.approvalStatus ?? "PENDING",
    seo: data.seo,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

interface ListHotelsOptions {
  pageSize?: number;
  cursor?: string | null;
  includeUnverified?: boolean;
  amenity?: HotelAmenity;
  search?: string;
  ownerId?: string;
}

export async function listHotels(options: ListHotelsOptions = {}): Promise<PageResult<Hotel>> {
  const { pageSize = 12, cursor, includeUnverified = false, amenity, search, ownerId } = options;
  const db = getAdminDb();
  const base = db.collection("hotels");

  if (ownerId) {
    const snapshot = await base.where("ownerId", "==", ownerId).orderBy("createdAt", "desc").limit(pageSize).get();
    return { items: snapshot.docs.map(mapHotelDoc), nextCursor: null };
  }

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    let query = base.orderBy("nameLower").startAt(term).endAt(term + "\uf8ff") as FirebaseFirestore.Query;
    if (!includeUnverified) query = query.where("approvalStatus", "==", "VERIFIED");
    const snapshot = await query.limit(pageSize).get();
    return { items: snapshot.docs.map(mapHotelDoc), nextCursor: null };
  }

  let query = base.orderBy("createdAt", "desc") as FirebaseFirestore.Query;
  if (!includeUnverified) query = query.where("approvalStatus", "==", "VERIFIED");
  if (amenity) query = query.where("amenities", "array-contains", amenity);

  return paginateQuery<Hotel>(query, mapHotelDoc, { pageSize, cursor });
}

export async function getHotel(id: string, { includeUnverified = false }: { includeUnverified?: boolean } = {}): Promise<Hotel | null> {
  const db = getAdminDb();
  const snapshot = await db.collection("hotels").doc(id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data()!;
  if (!includeUnverified && data.approvalStatus !== "VERIFIED") return null;
  return mapHotelDoc(snapshot as QueryDocumentSnapshot<DocumentData>);
}

export async function createHotel(ownerId: string, input: HotelInput): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection("hotels").doc();
  await ref.set({
    ownerId,
    name: input.name,
    nameLower: input.name.en.toLowerCase(),
    description: input.description,
    images: input.images,
    address: input.address,
    location: { latitude: input.latitude, longitude: input.longitude },
    contactPhone: input.contactPhone,
    amenities: input.amenities,
    priceRangeMin: input.priceRangeMin,
    priceRangeMax: input.priceRangeMax,
    policies: input.policies,
    approvalStatus: "PENDING",
    seo: { title: input.seoTitle, description: input.seoDescription, canonicalPath: input.canonicalPath },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateHotel(id: string, input: HotelInput): Promise<void> {
  const db = getAdminDb();
  await db.collection("hotels").doc(id).update({
    name: input.name,
    nameLower: input.name.en.toLowerCase(),
    description: input.description,
    images: input.images,
    address: input.address,
    location: { latitude: input.latitude, longitude: input.longitude },
    contactPhone: input.contactPhone,
    amenities: input.amenities,
    priceRangeMin: input.priceRangeMin,
    priceRangeMax: input.priceRangeMax,
    policies: input.policies,
    seo: { title: input.seoTitle, description: input.seoDescription, canonicalPath: input.canonicalPath },
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setHotelApproval(id: string, approvalStatus: Hotel["approvalStatus"]): Promise<void> {
  const db = getAdminDb();
  await db.collection("hotels").doc(id).update({ approvalStatus, updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteHotel(id: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("hotels").doc(id).delete();
}
