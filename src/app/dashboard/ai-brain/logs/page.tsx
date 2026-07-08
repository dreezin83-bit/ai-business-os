"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  History, RotateCcw, Clock, ArrowLeft, ArrowRight,
  Eye, GitBranch,
} from "lucide-react";

const versions = [
  { version: "v1.4", date: "2026-07-08 14:30:00", user: "Admin", changes: "Updated system prompt with new services", status: "current" },
  { version: "v1.3", date: "2026-07-05 09:15:00", user: "Admin", changes: "Adjusted creativity to balanced mode", status: "previous" },
  { version: "v1.2", date: "2026-07-01 16:45:00", user: "Admin", changes: "Added escalation rules for pricing", status: "previous" },
  { version: "v1.1", date: "2026-06-25 11:30:00", user: "Admin", changes: "Added lead qualification questions", status: "previous" },
  { version: "v1.0", date: "2026-06-20 10:00:00", user: "Admin", changes: "Initial configuration", status: "previous" },
];

export default function AiBrainLogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            AI Version History
          </h1>
          <p className="text-muted-foreground">Track changes, rollback, and audit AI configurations</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {versions.map((ver) => (
              <div key={ver.version} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-2.5 h-2.5 rounded-full ${
                      ver.status === "current" ? "bg-green-500" : "bg-muted-foreground"
                    }`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{ver.version}</span>
                        {ver.status === "current" && (
                          <Badge variant="success" className="text-[10px]">Current</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{ver.changes}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <Clock className="h-3 w-3" />
                        <span>{ver.date}</span>
                        <span>by {ver.user}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm"><Eye className="h-3.5 w-3.5 mr-1" /> Preview</Button>
                    <Button variant="outline" size="sm" disabled={ver.status === "current"}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Rollback
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}