"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, Button, LoadingState } from "@/components/ui";
import { LocalizedTextField } from "@/components/admin/LocalizedTextField";
import { announcementInputSchema } from "@/features/events/schemas";
import type { Announcement } from "@/features/events/types";
import type { PageResult } from "@/lib/pagination";

const emptyLocalized = { en: "", te: "" };

export function AnnouncementsPanel({ eventId }: { eventId: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState(emptyLocalized);
  const [body, setBody] = useState(emptyLocalized);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/announcements`);
      if (res.ok) {
        const data: PageResult<Announcement> = await res.json();
        setAnnouncements(data.items);
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    setError(null);
    const parsed = announcementInputSchema.safeParse({ title, body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid announcement");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error("Request failed");
      setTitle(emptyLocalized);
      setBody(emptyLocalized);
      await load();
    } catch {
      setError("Couldn't post the announcement. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/admin/events/${eventId}/announcements/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <Card padding="lg" className="flex max-w-2xl flex-col gap-5">
      <h2 className="text-lg font-semibold text-ink">Announcements</h2>
      {error && <p className="text-sm text-status-critical">{error}</p>}

      <LocalizedTextField label="Title" value={title} onChange={setTitle} />
      <LocalizedTextField label="Body" value={body} onChange={setBody} multiline />
      <div>
        <Button size="sm" onClick={handleCreate} disabled={submitting}>
          {submitting ? "Posting..." : "Post announcement"}
        </Button>
      </div>

      {loading && <LoadingState rows={2} />}

      {!loading && announcements.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {announcements.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 rounded-md bg-surface px-3 py-2">
              <div>
                <p className="text-sm font-medium text-ink">{a.title.en}</p>
                <p className="text-xs text-ink-muted">{a.body.en}</p>
              </div>
              <button onClick={() => handleDelete(a.id)} className="text-xs text-status-critical hover:underline">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
      {!loading && announcements.length === 0 && (
        <p className="border-t border-border pt-4 text-sm text-ink-muted">No announcements yet.</p>
      )}
    </Card>
  );
}
