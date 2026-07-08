"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, CreditCard } from "lucide-react";

const subscriptions = [
  { business: "Premier Plumbing Co.", tier: "Professional", status: "active", amount: 299, nextBilling: "2026-08-08", paymentMethod: "Stripe" },
  { business: "Elite Roofing Solutions", tier: "Enterprise", status: "active", amount: 999, nextBilling: "2026-08-07", paymentMethod: "Stripe" },
  { business: "Bright Smile Dental", tier: "Starter", status: "active", amount: 99, nextBilling: "2026-08-06", paymentMethod: "Stripe" },
  { business: "GreenLeaf Landscaping", tier: "Professional", status: "past_due", amount: 299, nextBilling: "2026-08-05", paymentMethod: "Stripe" },
  { business: "QuickFix HVAC", tier: "Professional", status: "active", amount: 299, nextBilling: "2026-08-04", paymentMethod: "Stripe" },
];

const tierPricing = [
  { tier: "Starter", price: 99, features: ["1 user", "500 AI calls/mo", "Basic CRM", "Email support"] },
  { tier: "Professional", price: 299, features: ["5 users", "5,000 AI calls/mo", "Full CRM", "SMS + Email", "Priority support"] },
  { tier: "Enterprise", price: 999, features: ["Unlimited users", "50,000 AI calls/mo", "Everything included", "Dedicated support", "Custom integrations"] },
];

export default function SubscriptionsPage() {
  const mrr = subscriptions.filter(s => s.status === "active").reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">Manage plans, pricing, and billing</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-3 bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Recurring Revenue</p>
                <p className="text-2xl font-bold">${mrr.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900/30">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Annual Run Rate</p>
                <p className="text-2xl font-bold">${(mrr * 12).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-3 bg-purple-100 dark:bg-purple-900/30">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{subscriptions.filter(s => s.status === "active").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Pricing Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {tierPricing.map((tier) => (
          <Card key={tier.tier} className="relative overflow-hidden">
            <CardHeader>
              <CardTitle>{tier.tier}</CardTitle>
              <p className="text-3xl font-bold">${tier.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="text-sm flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Business</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Tier</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Amount</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Next Billing</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Payment</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.business} className="border-b border-border hover:bg-muted/50">
                  <td className="py-3 px-2 font-medium">{sub.business}</td>
                  <td className="py-3 px-2"><Badge variant={sub.tier === "Enterprise" ? "default" : sub.tier === "Professional" ? "secondary" : "outline"}>{sub.tier}</Badge></td>
                  <td className="py-3 px-2"><Badge variant={sub.status === "active" ? "success" : "warning"}>{sub.status}</Badge></td>
                  <td className="py-3 px-2 font-mono">${sub.amount}/mo</td>
                  <td className="py-3 px-2 text-muted-foreground">{sub.nextBilling}</td>
                  <td className="py-3 px-2">{sub.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}