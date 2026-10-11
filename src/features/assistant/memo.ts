import type { AssistantData } from "./types";

/** Per-request memoisation: repeated tool calls in one conversation turn read each collection once. */
export function memoizeData(data: AssistantData): AssistantData {
  const cache = new Map<string, Promise<unknown>>();
  const once = <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    if (!cache.has(key)) cache.set(key, fn());
    return cache.get(key) as Promise<T>;
  };
  return {
    events: () => once("events", () => data.events()),
    announcements: (id) => once(`ann:${id}`, () => data.announcements(id)),
    ghats: (id) => once(`ghats:${id}`, () => data.ghats(id)),
    temples: () => once("temples", () => data.temples()),
    hotels: () => once("hotels", () => data.hotels()),
    purohits: () => once("purohits", () => data.purohits()),
    transport: () => once("transport", () => data.transport()),
    parking: () => once("parking", () => data.parking()),
    emergency: () => once("emergency", () => data.emergency()),
    itineraries: () => once("itineraries", () => data.itineraries()),
    packages: () => once("packages", () => data.packages()),
    content: () => once("content", () => data.content()),
  };
}
