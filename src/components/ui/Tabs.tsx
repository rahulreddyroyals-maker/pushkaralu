"use client";

import { cn } from "@/lib/utils/cn";
import { useState, type ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTabId?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTabId, className }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id);
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab?.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(tab.id)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                isActive ? "text-river-deep" : "text-ink-muted hover:text-ink"
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-saffron" />
              )}
            </button>
          );
        })}
      </div>
      <div className="pt-4">{activeTab?.content}</div>
    </div>
  );
}
