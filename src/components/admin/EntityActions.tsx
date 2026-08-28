"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

interface EntityActionsProps {
  published: boolean;
  publishUrl: string; // PATCH { published: boolean }
  deleteUrl: string; // DELETE
  entityLabel: string; // used in the delete confirmation copy
}

export function EntityActions({ published, publishUrl, deleteUrl, entityLabel }: EntityActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function togglePublish() {
    setBusy(true);
    try {
      await fetch(publishUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !published }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete this ${entityLabel}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await fetch(deleteUrl, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={togglePublish} disabled={busy}>
        {published ? "Unpublish" : "Publish"}
      </Button>
      <Button variant="danger" size="sm" onClick={handleDelete} disabled={busy}>
        Delete
      </Button>
    </div>
  );
}
