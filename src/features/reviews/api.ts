import { getAdminDb } from "@/lib/firebase/admin";
import { timestampToIso } from "@/lib/pagination";
import { FieldValue, type QueryDocumentSnapshot, type DocumentData } from "firebase-admin/firestore";
import type { Review, ReviewAggregate } from "./types";
import type { LeadProviderType } from "@/features/leads/types";
import type { ReviewInput } from "./schemas";

function mapReviewDoc(doc: QueryDocumentSnapshot<DocumentData>): Review {
  const data = doc.data();
  return {
    id: doc.id,
    providerId: data.providerId,
    providerType: data.providerType,
    userId: data.userId,
    userDisplayName: data.userDisplayName,
    rating: data.rating,
    text: data.text,
    createdAt: timestampToIso(data.createdAt),
  };
}

export async function listReviews(providerId: string, providerType: LeadProviderType, pageSize = 20): Promise<Review[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection("reviews")
    .where("providerId", "==", providerId)
    .where("providerType", "==", providerType)
    .orderBy("createdAt", "desc")
    .limit(pageSize)
    .get();
  return snapshot.docs.map(mapReviewDoc);
}

/**
 * Computed live from the review list rather than a maintained counter —
 * simpler and always-correct at the cost of an extra read on detail
 * pages, acceptable at this data scale. Revisit with a denormalized
 * counter (updated transactionally on review create) if provider pages
 * end up with hundreds of reviews each.
 */
export async function getReviewAggregate(providerId: string, providerType: LeadProviderType): Promise<ReviewAggregate> {
  const reviews = await listReviews(providerId, providerType, 500);
  if (reviews.length === 0) return { count: 0, average: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { count: reviews.length, average: Math.round((sum / reviews.length) * 10) / 10 };
}

export async function createReview(userId: string, userDisplayName: string, input: ReviewInput): Promise<string> {
  const db = getAdminDb();
  const ref = db.collection("reviews").doc();
  await ref.set({
    providerId: input.providerId,
    providerType: input.providerType,
    userId,
    userDisplayName,
    rating: input.rating,
    text: input.text,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function deleteReview(id: string): Promise<void> {
  const db = getAdminDb();
  await db.collection("reviews").doc(id).delete();
}
