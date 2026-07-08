"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";
import { useState } from "react";

const auditLogs = [
  { action: "Business Created", entity: "premier-plumbing", user: "super-admin@aibos.com", ip: "192.168.1.1", timestamp: "2026-07-08 14:30:00", type: "create" },
  { action: "Subscription Upgraded", entity: "elite-roofing", user: "super-admin@aibos.com", ip: "192.168.1.1", timestamp: "2026-07-08 12:15:00", type: "update" },
  { action: "Business Suspended", entity: "greenleaf", user: "super-admin@aibos.com", ip: "192.168.1.1", timestamp: "2026-07-07 09:45:00", type: "delete" },
  { action: "User Invited", entity: "premier-plumbing", user: "owner@premier.com", ip: "10.0.0.5", timestamp: "2026-07-07 08:20:00", type: "create" },
  { action: "API Key Regenerated", entity: "quickfix-hvac", user: "owner@quickfix.com", ip: "10.0.0.12", timestamp: "2026-07-06 16:00:00", type: "update" },
  { action: "Settings Updated", entity: "bright-smile", user: "owner@brightsmile.com", ip: "10.0.0.8", timestamp: "2026-07-06 14:30:00", type: "update" },
  { action: "Payment Failed", entity: "clearview-windows", user: "system", ip: "-", timestamp: "2026-07-05 10:00:00", type: "error" },
  { action: "Business Created", entity: "total-care-dental", user: "super-admin@aibos.com", ip: "192.168.1.1", timestamp: "2026-07-05 09:00:00", type: "create" },
];

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");

  const filtered = auditLogs.filter((log) =>
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.entity.toLowerCase().includes(search.toLowerCase()) ||
    log.user.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Track all platform changes and access</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span>Last 7 days</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Timestamp</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Action</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Entity</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">IP Address</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Type</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-3 text-muted-foreground font-mono text-xs">{log.timestamp}</td>
                    <td className="py-3 px-3 font-medium">{log.action}</td>
                    <td className="py-3 px-3 text-muted-foreground">{log.entity}</td>
                    <td className="py-3 px-3 text-muted-foreground">{log.user}</td>
                    <td className="py-3 px-3 font-mono text-xs text-muted-foreground">{log.ip}</td>
                    <td className="py-3 px-3">
                      <Badge variant={log.type === "create" ? "success" : log.type === "update" ? "warning" : log.type === "error" ? "destructive" : "secondary"}>
                        {log.type}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}