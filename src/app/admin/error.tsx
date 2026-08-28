"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Admin route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="p-8">
      <ErrorState
        title="This admin page couldn't load"
        description="Something went wrong loading this data. Try again, or check the server logs if it persists."
        action={{ label: "Try again", onClick: reset }}
      />
    </div>
  );
}
