"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Globe, Shield, Users, Mail, CreditCard, Save } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground">Configure global platform settings</p>
        </div>
        <Button><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Platform Name</label>
              <input type="text" defaultValue="AI Business OS" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Support Email</label>
              <input type="email" defaultValue="support@aibusinessos.com" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Default Timezone</label>
              <select className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1">
                <option>UTC</option>
                <option>America/New_York</option>
                <option>America/Chicago</option>
                <option>America/Los_Angeles</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">Require 2FA for all admin accounts</p>
              </div>
              <div className="w-12 h-6 rounded-full bg-primary relative cursor-pointer">
                <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 left-6 shadow" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Session Timeout</p>
                <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
              </div>
              <select className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
                <option>30 minutes</option>
                <option>1 hour</option>
                <option>4 hours</option>
                <option>8 hours</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Email Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">SMTP Host</label>
              <input type="text" defaultValue="smtp.sendgrid.net" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">SMTP Port</label>
                <input type="text" defaultValue="587" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">From Email</label>
                <input type="email" defaultValue="noreply@aibusinessos.com" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Default Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Max AI Calls/mo</label>
                <input type="text" defaultValue="50000" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Max Storage</label>
                <input type="text" defaultValue="5 GB" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Max Users</label>
                <input type="text" defaultValue="25" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Trial Days</label>
                <input type="text" defaultValue="14" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}