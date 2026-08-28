import { getAdminDb } from "@/lib/firebase/admin";
import { paginateQuery, timestampToIso, type PageResult } from "@/lib/pagination";
import { FieldValue, Timestamp, type QueryDocumentSnapshot, type DocumentData } from "firebase-admin/firestore";
import type { PushkaraluEvent } from "@/types/domain";
import type { Announcement } from "./types";
import type { EventInput, AnnouncementInput } from "./schemas";

/**
 * Server-only data-access layer for Events. Uses the Admin SDK (bypasses
 * Firestore rules) even for "public" reads — the visibility rule
 * (published-only for anonymous/non-staff callers) is enforced HERE in
 * application code, not by Firestore rules, because Server Components
 * render with server privileges. Firestore rules remain the enforcement
 * boundary for any DIRECT client SDK access (e.g. a future mobile app
 * reading Firestore straight from the device).
 */

function mapEventDoc(doc: QueryDocumentSnapshot<DocumentData>): PushkaraluEvent {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    river: data.river,
    year: data.year,
    startDate: data.startDate,
    endDate: data.endDate,
    description: data.description,
    status: data.status,
    published: data.published ?? false,
    featuredImage: data.featuredImage,
    seo: data.seo,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export async function listEvents(
  { pageSize = 12, cursor, includeUnpublished = false }: { pageSize?: number; cursor?: string | null; includeUnpublished?: boolean } = {}
): Promise<PageResult<PushkaraluEvent>> {
  const db = getAdminDb();
  let query = db.collection("events").orderBy("createdAt", "desc") as FirebaseFirestore.Query;
  if (!includeUnpublished) {
    query = query.where("published", "==", true);
  }
  return paginateQuery<PushkaraluEvent>(query, mapEventDoc, { pageSize, cursor });
}

export async function getEvent(id: string, { includeUnpublished = false }: { includeUnpublished?: boolean } = {}): Promise<PushkaraluEvent | null> {
  const db = getAdminDb();
  const snapshot = await db.collection("events").doc(id).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data()!;
  if (!includeUnpublished && !data.published) return null;
  return mapEventDoc(snapshot as QueryDocumentSnapshot<DocumentData>);
}

export async function createEvent(input: EventInput): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection("events").doc();
  await ref.set({
    name: input.name,
    river: input.river,
    year: input.year,
    startDate: input.startDate,
    endDate: input.endDate,
    description: input.description,
    status: input.status,
    published: false, // always created as a draft — publishing is a deliberate separate action
    featuredImage: input.featuredImage || null,
    seo: {
      title: input.seoTitle,
      description: input.seoDescription,
      canonicalPath: input.canonicalPath,
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(id: string, input: EventInput): Promise<void> {
  const db = getAdminDb();
  await db.collection("events").doc(id).update({
    name: input.name,
    river: input.river,
    year: input.year,
    startDate: input.startDate,
    endDate: input.endDate,
    description: input.description,
    status: input.status,
    featuredImage: input.featuredImage || null,
    seo: {
      title: input.seoTitle,
      description: input.seoDescription,
      canonicalPath: input.canonicalPath,
    },
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setEventPublished(id: string, published: boolean): Promise<void> {
  const db = getAdminDb();
  await db.collection("events").doc(id).update({ published, updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteEvent(id: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("events").doc(id).delete();
}

// ---------------------------------------------------------------------------
// Announcements (events/{eventId}/announcements/{id})
// ---------------------------------------------------------------------------

function mapAnnouncementDoc(eventId: string) {
  return (doc: QueryDocumentSnapshot<DocumentData>): Announcement => {
    const data = doc.data();
    return {
      id: doc.id,
      eventId,
      title: data.title,
      body: data.body,
      published: data.published ?? false,
      createdAt: timestampToIso(data.createdAt),
      updatedAt: timestampToIso(data.updatedAt),
    };
  };
}

export async function listAnnouncements(
  eventId: string,
  { pageSize = 10, cursor, includeUnpublished = false }: { pageSize?: number; cursor?: string | null; includeUnpublished?: boolean } = {}
): Promise<PageResult<Announcement>> {
  const db = getAdminDb();
  let query = db
    .collection("events")
    .doc(eventId)
    .collection("announcements")
    .orderBy("createdAt", "desc") as FirebaseFirestore.Query;
  if (!includeUnpublished) {
    query = query.where("published", "==", true);
  }
  return paginateQuery<Announcement>(query, mapAnnouncementDoc(eventId), { pageSize, cursor });
}

export async function createAnnouncement(eventId: string, input: AnnouncementInput): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection("events").doc(eventId).collection("announcements").doc();
  await ref.set({
    title: input.title,
    body: input.body,
    published: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function deleteAnnouncement(eventId: string, announcementId: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("events").doc(eventId).collection("announcements").doc(announcementId).delete();
}

// Re-exported for callers that only need the Timestamp helper alongside this module.
export { Timestamp };
