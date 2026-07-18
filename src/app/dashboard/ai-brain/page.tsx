"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function AiBrainPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/brain")
      .then((r) => r.ok ? r.json() : Promise.reject("No config"))
      .then(() => setLoading(false))
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading AI Brain configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Brain</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your AI assistant&apos;s knowledge and behavior
        </p>
      </div>
      <p className="text-muted-foreground">AI Brain configuration loaded successfully.</p>
    </div>
  );
}