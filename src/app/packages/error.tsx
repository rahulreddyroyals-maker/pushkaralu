"use client";

import { useEffect } from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { ErrorState } from "@/components/ui";

export default function PackagesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("packages route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState
          title="This page couldn't load"
          description="We couldn't reach that data. Check your connection and try again."
          action={{ label: "Try again", onClick: reset }}
        />
      </div>
    </SiteShell>
  );
}
