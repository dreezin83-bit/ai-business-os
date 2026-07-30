"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoaded) {
      const role = (user?.publicMetadata as any)?.role;
      setIsAdmin(role === "admin");
    }
  }, [isLoaded, user]);

  if (!isLoaded || isAdmin === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Unauthorized</h1>
          <p className="text-sm text-white/40">You don&apos;t have admin access to this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>
      <main className="md:pl-64 min-h-screen relative">
        <div className="p-4 md:p-8 max-w-7xl mx-auto pt-16 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
