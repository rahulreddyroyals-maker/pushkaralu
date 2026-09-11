"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Select, LoadingState, EmptyState } from "@/components/ui";
import type { Lead, LeadProviderType } from "@/features/leads/types";
import { LEAD_STATUSES } from "@/features/leads/types";

interface ProviderLeadsClientProps {
  providerId: string;
  providerType: LeadProviderType;
}

const STATUS_TONE = { NEW: "info", CONTACTED: "warning", CLOSED: "success" } as const;

export function ProviderLeadsClient({ providerId, providerType }: ProviderLeadsClientProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/leads?providerId=${providerId}&providerType=${providerType}`);
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        if (!cancelled) setLeads(data.items);
      } catch {
        if (!cancelled) setError("Couldn't load inquiries.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [providerId, providerType]);

  async function updateStatus(leadId: string, status: string) {
    await fetch(`/api/leads/${leadId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: status as Lead["status"] } : l)));
  }

  if (loading) return <LoadingState rows={3} />;
  if (error) return <p className="text-sm text-status-critical">{error}</p>;
  if (leads.length === 0) return <EmptyState title="No inquiries yet" description="Inquiries from visitors will appear here." />;

  return (
    <div className="flex flex-col gap-3">
      {leads.map((lead) => (
        <Card key={lead.id} padding="md" className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-ink">{lead.userDisplayName}</p>
              <Badge tone={STATUS_TONE[lead.status]}>{lead.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-muted">{lead.message}</p>
            <p className="mt-1 font-data text-xs text-ink-muted">Call back: {lead.userContactPhone}</p>
          </div>
          <Select
            value={lead.status}
            onChange={(e) => updateStatus(lead.id, e.target.value)}
            options={LEAD_STATUSES.map((s) => ({ value: s, label: s }))}
          />
        </Card>
      ))}
    </div>
  );
}
