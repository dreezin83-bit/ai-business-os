import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="md:pl-64 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto pt-16 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}