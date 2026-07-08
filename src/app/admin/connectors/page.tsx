"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Puzzle, Globe, Smartphone, Mail, CreditCard, Zap, Webhook } from "lucide-react";

const connectors = [
  { name: "Google Calendar", status: "operational", icon: Globe, color: "text-blue-500", businesses: 86 },
  { name: "Google Auth", status: "operational", icon: Globe, color: "text-blue-500", businesses: 92 },
  { name: "Microsoft Auth", status: "degraded", icon: Globe, color: "text-blue-600", businesses: 34 },
  { name: "Twilio SMS", status: "operational", icon: Smartphone, color: "text-red-500", businesses: 78 },
  { name: "SMTP / Email", status: "maintenance", icon: Mail, color: "text-amber-500", businesses: 45 },
  { name: "Stripe", status: "operational", icon: CreditCard, color: "text-purple-500", businesses: 128 },
  { name: "Zapier", status: "operational", icon: Zap, color: "text-orange-500", businesses: 52 },
  { name: "Webhooks", status: "operational", icon: Webhook, color: "text-cyan-500", businesses: 38 },
];

export default function AdminConnectorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Connector Management</h1>
        <p className="text-muted-foreground">Monitor and manage platform-wide integrations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Connectors", value: "8" },
          { label: "Operational", value: "6", color: "text-green-600" },
          { label: "Degraded", value: "1", color: "text-amber-500" },
          { label: "In Maintenance", value: "1", color: "text-blue-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color || ""}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Connector</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Businesses</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {connectors.map((conn) => (
                <tr key={conn.name} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <conn.icon className={`h-5 w-5 ${conn.color}`} />
                      <span className="font-medium">{conn.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={conn.status === "operational" ? "success" : conn.status === "degraded" ? "warning" : "secondary"}>
                      {conn.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">{conn.businesses}</td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="outline" size="sm">Configure</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}