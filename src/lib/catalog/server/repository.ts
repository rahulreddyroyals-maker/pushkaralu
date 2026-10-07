import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { paginateQuery, timestampToIso, type PageResult } from "@/lib/pagination";
import { FieldValue, Timestamp, type DocumentData, type QueryDocumentSnapshot, type DocumentSnapshot } from "firebase-admin/firestore";
import { CatalogConflictError, CatalogNotFoundError, type CatalogDefinition, type CatalogRecordBase } from "../types";

export type StoredRecord = CatalogRecordBase & Record<string, unknown>;

export interface ListOptions {
  pageSize?: number;
  cursor?: string | null;
  includeUnpublished?: boolean;
  search?: string;
  /** Raw equality filters; only keys in def.filterKeys are honoured. */
  filters?: Record<string, string | undefined>;
  /** Strip def.privateFields (anything rendered to the public must set this). */
  publicView?: boolean;
}

/** Firestore rejects `undefined`; optional form fields arrive as missing keys but nested lists can carry them. */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripUndefined) as unknown as T;
  if (value && typeof value === "object" && !(value instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

function coerceFilter(value: string): string | boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

export function mapCatalogDoc(def: CatalogDefinition, publicView = false) {
  return (doc: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): StoredRecord => {
    const data = doc.data() ?? {};
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === "nameLower") continue;
      if (publicView && def.privateFields.includes(key)) continue;
      out[key] = value instanceof Timestamp ? value.toDate().toISOString() : value;
    }
    return {
      ...out,
      id: doc.id,
      published: data.published ?? false,
      createdAt: timestampToIso(data.createdAt),
      updatedAt: timestampToIso(data.updatedAt),
    } as StoredRecord;
  };
}

function searchTerm(def: CatalogDefinition, data: Record<string, unknown>): string {
  const title = data[def.titleField] as { en?: string } | undefined;
  return (title?.en ?? "").toLowerCase();
}

export async function listCatalog(def: CatalogDefinition, options: ListOptions = {}): Promise<PageResult<StoredRecord>> {
  const { pageSize = 12, cursor, includeUnpublished = false, search, filters = {}, publicView = false } = options;
  const map = mapCatalogDoc(def, publicView);
  let query = getAdminDb().collection(def.collection) as FirebaseFirestore.Query;

  const term = search?.trim().toLowerCase();
  query = term ? query.orderBy("nameLower").startAt(term).endAt(term + "") : query.orderBy("createdAt", "desc");
  if (!includeUnpublished) query = query.where("published", "==", true);
  for (const key of def.filterKeys) {
    const value = filters[key];
    if (value !== undefined && value !== "") query = query.where(key, "==", coerceFilter(value));
  }

  // Prefix search is a bounded, un-paginated read (same trade-off as Sprint 3 ghats/temples).
  if (term) {
    const snapshot = await query.limit(pageSize).get();
    return { items: snapshot.docs.map(map), nextCursor: null };
  }
  return paginateQuery<StoredRecord>(query, map, { pageSize, cursor });
}

export async function getCatalog(
  def: CatalogDefinition,
  id: string,
  { includeUnpublished = false, publicView = false }: { includeUnpublished?: boolean; publicView?: boolean } = {}
): Promise<StoredRecord | null> {
  if (!id) return null;
  const snapshot = await getAdminDb().collection(def.collection).doc(id).get();
  if (!snapshot.exists) return null;
  if (!includeUnpublished && !snapshot.data()?.published) return null;
  return mapCatalogDoc(def, publicView)(snapshot);
}

/** Batched lookup for resolving references (boat -> operator, package -> itinerary). Missing/unpublished ids are skipped. */
export async function getCatalogMany(
  def: CatalogDefinition,
  ids: string[],
  { includeUnpublished = false, publicView = false }: { includeUnpublished?: boolean; publicView?: boolean } = {}
): Promise<StoredRecord[]> {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 100);
  if (unique.length === 0) return [];
  const db = getAdminDb();
  const snapshots = await db.getAll(...unique.map((id) => db.collection(def.collection).doc(id)));
  const map = mapCatalogDoc(def, publicView);
  return snapshots.filter((s) => s.exists && (includeUnpublished || s.data()?.published)).map(map);
}

/** All records whose `field` equals `value` — for the "boats of this operator" style reads. Bounded. */
export async function listCatalogBy(
  def: CatalogDefinition,
  field: string,
  value: string,
  { includeUnpublished = false, publicView = false, limit = 50 }: { includeUnpublished?: boolean; publicView?: boolean; limit?: number } = {}
): Promise<StoredRecord[]> {
  let query = getAdminDb().collection(def.collection).where(field, "==", value) as FirebaseFirestore.Query;
  if (!includeUnpublished) query = query.where("published", "==", true);
  const snapshot = await query.limit(limit).get();
  return snapshot.docs.map(mapCatalogDoc(def, publicView));
}

function withDerived(def: CatalogDefinition, data: Record<string, unknown>): Record<string, unknown> {
  return { ...data, ...(def.derive ? def.derive(data) : {}), nameLower: searchTerm(def, data) };
}

function defaultCanonical(def: CatalogDefinition, data: Record<string, unknown>, id: string): Record<string, unknown> {
  const seo = data.seo as { canonicalPath?: string } | undefined;
  if (!seo || seo.canonicalPath) return data;
  return { ...data, seo: { ...seo, canonicalPath: `${def.publicPath}/${id}` } };
}

export async function createCatalog(def: CatalogDefinition, input: Record<string, unknown>): Promise<string> {
  const ref = getAdminDb().collection(def.collection).doc();
  const stamps: Record<string, unknown> = {};
  for (const { field, stampField } of def.stampOnChange) {
    if (input[field] !== undefined) stamps[stampField] = FieldValue.serverTimestamp();
  }
  await ref.set({
    ...stripUndefined(withDerived(def, defaultCanonical(def, input, ref.id))),
    ...stamps,
    published: false, // new records are always drafts — publishing is an explicit, audited action
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateCatalog(def: CatalogDefinition, id: string, input: Record<string, unknown>): Promise<void> {
  const ref = getAdminDb().collection(def.collection).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new CatalogNotFoundError(def.label);
  const before = existing.data() ?? {};

  const stamps: Record<string, unknown> = {};
  for (const { field, stampField } of def.stampOnChange) {
    stamps[stampField] = before[field] !== input[field] || !before[stampField] ? FieldValue.serverTimestamp() : before[stampField];
  }
  // Full replace (not merge) so cleared optional fields really disappear; server-owned fields are carried over explicitly.
  await ref.set({
    ...stripUndefined(withDerived(def, defaultCanonical(def, input, id))),
    ...stamps,
    published: before.published ?? false,
    createdAt: before.createdAt ?? FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function setCatalogPublished(def: CatalogDefinition, id: string, published: boolean): Promise<void> {
  const ref = getAdminDb().collection(def.collection).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new CatalogNotFoundError(def.label);
  await ref.update({ published, updatedAt: FieldValue.serverTimestamp() });
}

export async function deleteCatalog(def: CatalogDefinition, id: string): Promise<void> {
  const db = getAdminDb();
  for (const dep of def.dependents) {
    const used = await db.collection(dep.collection).where(dep.field, "==", id).limit(1).get();
    if (!used.empty) {
      throw new CatalogConflictError(`This ${def.label.toLowerCase()} is still used by ${dep.label}. Remove or reassign those first.`);
    }
  }
  await db.collection(def.collection).doc(id).delete();
}
