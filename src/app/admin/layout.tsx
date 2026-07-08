import { AdminSidebar } from "@/components/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AdminSidebar />
      <main className="pl-64 min-h-screen bg-muted/30">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}