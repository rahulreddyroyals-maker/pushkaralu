import type { z } from "zod";

/**
 * Reusable provider architecture — Sprint 6.
 *
 * Every Sprint 6 entity (transport services, boat operators/boats/routes,
 * parking, restaurants, tourism places, itineraries, travel packages) is
 * an *admin-managed catalog*: same lifecycle (draft -> published), same
 * paginated reads, same audit trail, same admin form machinery. Rather
 * than copy the Sprint 3 temples stack nine times, each module is a
 * single `CatalogDefinition` (schema + form fields + a few knobs) and the
 * repository, route handlers, admin pages and public list UI are shared.
 *
 * This file is client-safe (types only). Server code lives in ./server.
 */

export type FieldDescriptor =
  | { type: "localized"; name: string; label: string; multiline?: boolean }
  | { type: "text"; name: string; label: string; placeholder?: string; hint?: string; multiline?: boolean }
  | { type: "number"; name: string; label: string; step?: string; hint?: string }
  | { type: "time"; name: string; label: string; hint?: string }
  | { type: "date"; name: string; label: string }
  | { type: "select"; name: string; label: string; options: { value: string; label: string }[] }
  | { type: "boolean"; name: string; label: string }
  | { type: "tags"; name: string; label: string; placeholder?: string; suggestions?: { value: string; label: string }[] }
  | { type: "geo"; name: string; label: string; optional?: boolean }
  | { type: "images"; name: string; label: string }
  | { type: "seo"; name: string; label: string }
  /** Reference to another catalog (by registry key); options are loaded server-side and passed to the form. */
  | { type: "ref"; name: string; label: string; refKey: string; optional?: boolean }
  /** Repeating group of sub-fields (e.g. schedule rows, itinerary days). Lists may nest. */
  | { type: "list"; name: string; label: string; itemLabel: string; fields: FieldDescriptor[]; itemDefaults?: Record<string, unknown> };

export interface CatalogDefinition {
  /** URL-safe key — used in /admin/{key}, /api/admin/catalog/{key}, /api/catalog/{key}. */
  key: string;
  /** Firestore collection name. */
  collection: string;
  label: string;
  labelPlural: string;
  icon: string;
  /** Public listing path ("/parking"); detail pages live at `${publicPath}/${id}`. */
  publicPath: string;
  /** Prefix for audit actions, e.g. "PARKING" -> PARKING_CREATED. */
  auditPrefix: string;
  /** Storage folder for ImageUploader (images/{imageFolder}/{id}/...). */
  imageFolder: string;
  schema: z.ZodType<Record<string, unknown>>;
  fields: FieldDescriptor[];
  /** Initial form values for a new record. */
  defaults: Record<string, unknown>;
  /** Localized field used for the title + prefix search ("name" or "title"). */
  titleField: "name" | "title";
  /** Fields that may be used as equality filters (each needs a Firestore composite index — see docs/SPRINT_6.md). */
  filterKeys: string[];
  /** Fields removed from every public read (provider phone numbers etc.). Admin reads keep them. */
  privateFields: string[];
  /** When `field` changes (or is first set) the server stamps `stampField` — keeps "Updated X ago" honest for manually entered status. */
  stampOnChange: { field: string; stampField: string }[];
  /** Refuse delete while other documents still reference this one. */
  dependents: { collection: string; field: string; label: string }[];
  /** Server-side derived, queryable fields (e.g. trip type from duration). Never trusted from the client. */
  derive?: (data: Record<string, unknown>) => Record<string, unknown>;
}

/** A stored catalog document as read back — `unknown` extras are narrowed per module via z.infer. */
export interface CatalogRecordBase {
  id: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CatalogRecord<T> = CatalogRecordBase & T;

export class CatalogNotFoundError extends Error {
  constructor(what = "Record") {
    super(`${what} not found`);
    this.name = "CatalogNotFoundError";
  }
}

export class CatalogConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogConflictError";
  }
}
