import { Timestamp, type Query, type DocumentData, type QueryDocumentSnapshot } from "firebase-admin/firestore";

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Cursor-based pagination over a Firestore query already ordered by
 * `createdAt` descending (caller applies `.orderBy("createdAt", "desc")`
 * before passing the query in). The cursor exposed to callers is a plain
 * ISO string — safe to put in a URL or JSON response — but internally
 * converted back to a Firestore `Timestamp` for the cursor comparison,
 * since that's the actual stored type and a raw JS `Date` doesn't compare
 * correctly against it.
 *
 * `mapDoc` does the doc -> domain-type conversion (including any
 * Timestamp -> ISO string field conversion) so this helper stays
 * feature-agnostic.
 */
export async function paginateQuery<T>(
  query: Query<DocumentData>,
  mapDoc: (doc: QueryDocumentSnapshot<DocumentData>) => T,
  { pageSize = 12, cursor }: { pageSize?: number; cursor?: string | null }
): Promise<PageResult<T>> {
  let q = query.limit(pageSize + 1);
  if (cursor) {
    q = q.startAfter(Timestamp.fromDate(new Date(cursor)));
  }
  const snapshot = await q.get();
  const hasMore = snapshot.docs.length > pageSize;
  const docs = snapshot.docs.slice(0, pageSize);
  const items = docs.map(mapDoc);

  const lastRawCreatedAt = docs[docs.length - 1]?.data()?.createdAt as Timestamp | undefined;
  const nextCursor = hasMore && lastRawCreatedAt ? lastRawCreatedAt.toDate().toISOString() : null;

  return { items, nextCursor };
}

/** Converts a Firestore Timestamp (or an already-string value, or missing field) into an ISO string. */
export function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return new Date(0).toISOString();
}
