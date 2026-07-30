"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Phone, Mail, Globe, MapPin, CreditCard, AlertTriangle, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/toaster";

interface TenantDetail {
  id: string; name: string; category: string; status: string; onboardingComplete: boolean; signedUpAt: string;
  phone: string; email: string; website: string; address: string;
  aiNumbers: { number: string; provider: string }[];
  subscription: { plan: string; status: string; amount: number; currency: string; interval: string; currentPeriodStart: string; currentPeriodEnd: string; canceledAt: string | null } | null;
  usage: { totalConversations: number; aiCallsTotal: number; aiCallsToday: number; tokensIn: number; tokensOut: number; smsSent: number; emailsSent: number };
  suspendedAt: string | null;
}

export default function AdminTenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/tenants/${id}`)
      .then((r) => { if (r.status === 403 || r.status === 404) { setError(true); setLoading(false); return null; } return r.json(); })
      .then((d) => { if (d) setTenant(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSuspend = async () => {
    if (!confirm(`Suspend ${tenant?.name}? They will lose access until reactivated.`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/suspend`, { method: "POST" });
      if (res.ok) { setTenant((t) => t ? { ...t, status: "suspended" } : t); toast("Tenant suspended", "success"); }
      else toast("Failed to suspend", "error");
    } catch { toast("Failed to suspend", "error"); }
    setActionLoading(false);
  };

  const handleReactivate = async () => {
    if (!confirm(`Reactivate ${tenant?.name}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/reactivate`, { method: "POST" });
      if (res.ok) { setTenant((t) => t ? { ...t, status: "active" } : t); toast("Tenant reactivated", "success"); }
      else toast("Failed to reactivate", "error");
    } catch { toast("Failed to reactivate", "error"); }
    setActionLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !tenant) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5"><XCircle className="h-8 w-8 text-red-400/50" /><p className="text-sm text-white/40">Tenant not found or access denied</p><Link href="/admin/tenants"><Button variant="outline" size="sm">Back to Tenants</Button></Link></div>;

  const sub = tenant.subscription;
  const amount = sub ? (sub.amount / 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/admin/tenants"><Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div><h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1><p className="text-sm text-muted-foreground">{tenant.category || "No category"}</p></div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Business Info</CardTitle>
          <Badge variant="outline" className={`text-xs border-0 ${tenant.status==="active"?"bg-emerald-500/20 text-emerald-300":"bg-red-500/20 text-red-300"}`}>{tenant.status}</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Phone, label: "Phone", value: tenant.phone || "\u2014" },
              { icon: Mail, label: "Email", value: tenant.email || "\u2014" },
              { icon: Globe, label: "Website", value: tenant.website || "\u2014" },
              { icon: MapPin, label: "Address", value: tenant.address || "\u2014" },
              { icon: CreditCard, label: "Plan", value: sub ? `${sub.plan} \u00b7 $${amount}/${sub.interval}` : "No subscription" },
              { icon: CheckCircle2, label: "Onboarding", value: tenant.onboardingComplete ? "Complete" : "Incomplete" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3"><f.icon className="h-4 w-4 text-white/30 shrink-0" /><div className="min-w-0"><p className="text-[10px] text-white/30 uppercase">{f.label}</p><p className="text-sm text-white/70 truncate">{f.value}</p></div></div>
            ))}
          </div>
          {tenant.aiNumbers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]"><p className="text-[10px] text-white/30 uppercase mb-2">AI Numbers</p><div className="flex flex-wrap gap-2">{tenant.aiNumbers.map((n) => (<code key={n.number} className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs font-mono text-white/60">{n.number}</code>))}</div></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Usage</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "AI Calls (Total)", value: tenant.usage.aiCallsTotal },
              { label: "AI Calls (Today)", value: tenant.usage.aiCallsToday },
              { label: "Conversations", value: tenant.usage.totalConversations },
              { label: "SMS Sent", value: tenant.usage.smsSent },
              { label: "Emails Sent", value: tenant.usage.emailsSent },
              { label: "Tokens In", value: tenant.usage.tokensIn?.toLocaleString() || 0 },
              { label: "Tokens Out", value: tenant.usage.tokensOut?.toLocaleString() || 0 },
              { label: "Signed Up", value: tenant.signedUpAt ? new Date(tenant.signedUpAt).toLocaleDateString() : "\u2014" },
            ].map((u) => (
              <div key={u.label} className="stat-card"><p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">{u.label}</p><p className="text-lg font-bold text-white">{u.value}</p></div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" /> Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {tenant.status === "active" ? (
              <Button variant="destructive" onClick={handleSuspend} disabled={actionLoading} size="sm">{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}Suspend Tenant</Button>
            ) : (
              <Button variant="default" onClick={handleReactivate} disabled={actionLoading} size="sm" className="bg-emerald-600 hover:bg-emerald-500">{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}Reactivate Tenant</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
