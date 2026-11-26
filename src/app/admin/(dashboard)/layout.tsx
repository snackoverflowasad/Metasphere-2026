import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAdminContext } from "@/lib/auth/session";
import { loadAdminEditionData } from "@/lib/cms/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AdminEditionSwitcher } from "@/components/admin/AdminEditionSwitcher";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Admin Console",
    template: "%s | MetaSphere Admin",
  },
  robots: { index: false, follow: false },
};

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseConfigured = isSupabaseConfigured();
  if (!supabaseConfigured) {
    redirect("/admin/login");
  }

  const adminContext = await getAdminContext();
  if (!adminContext) {
    redirect("/admin/login");
  }

  const initialData = await loadAdminEditionData(2027);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      <Suspense
        fallback={
          <aside className="hidden lg:block lg:w-64 border-r border-slate-200 bg-white p-4" />
        }
      >
        <AdminSidebar
          userEmail={adminContext.email}
          displayName={adminContext.displayName}
          role={adminContext.role}
          supabaseConfigured={supabaseConfigured}
        />
      </Suspense>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 max-w-6xl mx-auto">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-slate-900">
                MetaSphere CMS
              </span>
              <Badge variant="secondary" className="text-[11px] font-medium">
                IST (UTC+5:30)
              </Badge>
              {initialData.source === "fallback" && (
                <Badge variant="draft" className="text-[11px]">
                  Seed Snapshot Fallback
                </Badge>
              )}
            </div>

            <Suspense fallback={<div className="h-8 w-48" />}>
              <AdminEditionSwitcher
                editions={initialData.availableEditions}
                selectedYear={initialData.selectedYear}
              />
            </Suspense>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-6xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
