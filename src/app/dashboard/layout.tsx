import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="pl-64 min-h-screen bg-background">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}