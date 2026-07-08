"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Plus, MoreHorizontal, Filter, ArrowUpDown } from "lucide-react";
import { useState } from "react";

const allBusinesses = [
  { name: "Premier Plumbing Co.", slug: "premier-plumbing", tier: "Professional", status: "active", users: 5, revenue: "$299/mo" },
  { name: "Elite Roofing Solutions", slug: "elite-roofing", tier: "Enterprise", status: "active", users: 12, revenue: "$999/mo" },
  { name: "Bright Smile Dental", slug: "bright-smile", tier: "Starter", status: "active", users: 3, revenue: "$99/mo" },
  { name: "GreenLeaf Landscaping", slug: "greenleaf", tier: "Professional", status: "suspended", users: 2, revenue: "$299/mo" },
  { name: "QuickFix HVAC", slug: "quickfix-hvac", tier: "Professional", status: "active", users: 4, revenue: "$299/mo" },
  { name: "Total Care Dental", slug: "total-care-dental", tier: "Enterprise", status: "active", users: 8, revenue: "$999/mo" },
  { name: "Summit Roofing", slug: "summit-roofing", tier: "Starter", status: "active", users: 2, revenue: "$99/mo" },
  { name: "ClearView Windows", slug: "clearview-windows", tier: "Professional", status: "inactive", users: 1, revenue: "$299/mo" },
];

export default function BusinessesPage() {
  const [search, setSearch] = useState("");

  const filtered = allBusinesses.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Businesses</h1>
          <p className="text-muted-foreground">Manage all tenant businesses</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Business
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search businesses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" /> Filter</Button>
              <Button variant="outline" size="sm"><ArrowUpDown className="h-4 w-4 mr-1" /> Sort</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Business</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Tier</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Users</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((biz) => (
                  <tr key={biz.slug} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-3">
                      <p className="font-medium">{biz.name}</p>
                      <p className="text-xs text-muted-foreground">{biz.slug}</p>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={biz.tier === "Enterprise" ? "default" : biz.tier === "Professional" ? "secondary" : "outline"}>
                        {biz.tier}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={biz.status === "active" ? "success" : biz.status === "suspended" ? "destructive" : "warning"}>
                        {biz.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">{biz.users}</td>
                    <td className="py-3 px-3 font-mono">{biz.revenue}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm">Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive">Suspend</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Showing {filtered.length} businesses</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}