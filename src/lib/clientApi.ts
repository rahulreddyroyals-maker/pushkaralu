export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** Small fetch wrapper for client components: always returns a result object, never throws, and surfaces only the server's safe message. */
export async function api<T = unknown>(url: string, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "Something went wrong. Please try again." };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 0, error: "Couldn't reach the server. Check your connection and try again." };
  }
}
