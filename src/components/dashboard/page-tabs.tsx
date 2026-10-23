"use client";

import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export type PageTab<T extends string> = {
  id: T;
  label: string;
  icon?: ComponentType<{ className?: string }>;
};

/**
 * PageTabs — shared pill tab bar for the unified dashboard tab views
 * (/dashboard/communications, /dashboard/ai-brain). Renders from theme
 * tokens so it works across all four dashboard themes.
 */
export function PageTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: PageTab<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg bg-[var(--dash-hover)] p-0.5">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-[var(--dash-card-hover)] text-[var(--dash-heading)] shadow-sm"
                : "text-[var(--dash-muted)] hover:bg-[var(--dash-card-hover)] hover:text-[var(--dash-heading)]"
            )}
          >
            {t.icon && <t.icon className="h-3.5 w-3.5 shrink-0" />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}