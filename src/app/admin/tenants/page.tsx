"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, Search, ArrowUpDown, ArrowRight, ShieldAlert } from "lucide-react";

interface Tenant { id: string; name: string; category: string; plan: string; subStatus: string; status: string; phoneNumber: string | null; onboardingComplete: boolean; signedUpAt: string; }
type SortKey = "name" | "plan" | "status" | "signedUpAt";

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended">("all");
  const [sortKey, setSortKey] = useState<SortKey>("signedUpAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;

  useEffect(() => {
    fetch("/api/admin/tenants")
      .then((r) => { if (r.status === 403) { setError(true); setLoading(false); return null; } return r.json(); })
      .then((data) => { if (data) setTenants(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let list = tenants;
    if (filter !== "all") list = list.filter((t) => t.status === filter);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter((t) => t.name?.toLowerCase().includes(q)); }
    list = [...list].sort((a, b) => { const va = (a[sortKey] ?? "").toString().toLowerCase(); const vb = (b[sortKey] ?? "").toString().toLowerCase(); return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va); });
    return list;
  }, [tenants, filter, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-8 w-48 bg-white/[0.06] rounded" /><div className="h-10 w-full bg-white/[0.04] rounded-xl" /><div className="space-y-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-12 bg-white/[0.03] rounded-xl" />)}</div></div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5"><ShieldAlert className="h-8 w-8 text-red-400/50" /><p className="text-sm text-white/40">Unauthorized — admin access required</p></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Users className="h-6 w-6" /> Tenants</h1><p className="text-sm text-muted-foreground mt-1">{tenants.length} businesses on the platform.</p></div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" /><Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search by business name..." className="pl-9" /></div>
        <div className="flex gap-1">{(["all","active","suspended"] as const).map((f) => (<button key={f} onClick={() => { setFilter(f); setPage(0); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter===f?"bg-white/10 text-white":"text-white/40 hover:text-white/70 hover:bg-white/[0.04]"}`}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>))}</div>
      </div>
      <Card><CardContent className="p-0">
        {pageItems.length===0 ? <div className="text-center py-10 text-sm text-white/30">No tenants found.</div> : (<>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/[0.06]">
            {[{key:"name",label:"Name"},{key:"plan",label:"Plan"},{key:"status",label:"Status"},{key:"signedUpAt",label:"Signed Up"}].map((col)=>(<th key={col.key} onClick={()=>toggleSort(col.key as SortKey)} className="px-4 py-3 text-left text-[11px] font-semibold text-white/30 uppercase tracking-wider cursor-pointer hover:text-white/50 transition-colors select-none"><span className="inline-flex items-center gap-1">{col.label}<ArrowUpDown className="h-3 w-3 opacity-40"/></span></th>))}
            <th className="px-4 py-3 w-10"/>
          </tr></thead><tbody>
            {pageItems.map((t)=>(<tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
              <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-semibold text-blue-400 shrink-0">{(t.name||"?").slice(0,2).toUpperCase()}</div><div><p className="font-medium text-white/80">{t.name}</p><p className="text-[11px] text-white/25">{t.category||"\u2014"}</p></div></div></td>
              <td className="px-4 py-3"><span className="text-white/50 capitalize">{t.plan||"none"}</span></td>
              <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] border-0 ${t.status==="active"?"bg-emerald-500/20 text-emerald-300":"bg-amber-500/20 text-amber-300"}`}>{t.status}</Badge></td>
              <td className="px-4 py-3 text-white/35 text-xs">{t.signedUpAt?new Date(t.signedUpAt).toLocaleDateString():"\u2014"}</td>
              <td className="px-4 py-3"><Link href={`/admin/tenant/${t.id}`}><Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight className="h-3.5 w-3.5"/></Button></Link></td>
            </tr>))}
          </tbody></table></div>
          {totalPages>1&&(<div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]"><span className="text-xs text-white/25">{filtered.length} results &middot; Page {page+1} of {totalPages}</span><div className="flex gap-1"><Button variant="ghost" size="sm" disabled={page===0} onClick={()=>setPage((p)=>p-1)} className="h-7 text-xs">Prev</Button><Button variant="ghost" size="sm" disabled={page>=totalPages-1} onClick={()=>setPage((p)=>p+1)} className="h-7 text-xs">Next</Button></div></div>)}
        </>)}
      </CardContent></Card>
    </div>
  );
}
