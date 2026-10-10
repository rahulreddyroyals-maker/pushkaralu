import type { CatalogDefinition } from "@/lib/catalog/types";
import { transportDefinition } from "@/features/transport/definition";
import { boatOperatorDefinition, boatDefinition, boatRouteDefinition } from "@/features/boats/definition";
import { emergencyDefinition } from "@/features/emergency/definition";
import { parkingDefinition } from "@/features/parking/definition";
import { restaurantDefinition } from "@/features/restaurants/definition";
import { CONTENT_DEFINITIONS } from "@/features/content/definitions";
import { tourismPlaceDefinition, itineraryDefinition, travelPackageDefinition } from "@/features/tourism/definition";

/**
 * The one list of admin-managed catalogs. Adding a new catalog (e.g. hospitals,
 * pharmacies) means: write a definition, add it here — admin CRUD pages, API
 * routes, audit logging, pagination and the public list API all follow.
 */
export const CATALOG_DEFINITIONS: CatalogDefinition[] = [
  transportDefinition,
  boatOperatorDefinition,
  boatDefinition,
  boatRouteDefinition,
  parkingDefinition,
  restaurantDefinition,
  tourismPlaceDefinition,
  itineraryDefinition,
  travelPackageDefinition,
  emergencyDefinition,
  ...CONTENT_DEFINITIONS,
];

const BY_KEY = new Map(CATALOG_DEFINITIONS.map((d) => [d.key, d]));

export function getCatalogDefinition(key: string): CatalogDefinition | undefined {
  return BY_KEY.get(key);
}

export function requireCatalogDefinition(key: string): CatalogDefinition {
  const def = BY_KEY.get(key);
  if (!def) throw new Error(`Unknown catalog: ${key}`);
  return def;
}
