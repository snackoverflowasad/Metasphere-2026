"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  CalendarClock,
  ExternalLink,
  Eye,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import type { AdminRole } from "@/types/database";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface AdminSidebarProps {
  userEmail: string;
  displayName: string | null;
  role: AdminRole;
  supabaseConfigured: boolean;
}

const NAV_ITEMS = [
  {
    href: "/admin/overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/event-settings",
    label: "Event Settings & SEO",
    icon: Settings,
  },
  {
    href: "/admin/deadlines",
    label: "Important Dates",
    icon: CalendarClock,
  },
  {
    href: "/admin/resources",
    label: "Links & Resources",
    icon: Link2,
  },
] as const;

export function AdminSidebar({
  userEmail,
  displayName,
  role,
  supabaseConfigured,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const editionQuery = searchParams.get("edition");
  const querySuffix = editionQuery ? `?edition=${encodeURIComponent(editionQuery)}` : "";
  const previewHref = `/api/preview?edition=${encodeURIComponent(editionQuery || "2027")}`;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      if (supabaseConfigured) {
        const supabase = createBrowserSupabase();
        await supabase.auth.signOut();
      }
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <Link
            href={`/admin/overview${querySuffix}`}
            className="flex items-center gap-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
                MetaSphere
              </p>
              <p className="text-sm font-bold text-slate-900">Admin Console</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={`${item.href}${querySuffix}`}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-orange-50 text-orange-700 border border-orange-200/70"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-orange-600" : "text-slate-400"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 pt-4 space-y-1.5">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Site Preview
          </p>
          <a
            href={previewHref}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Eye className="h-4 w-4 text-slate-400" />
              Preview Draft Mode
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>
          <Link
            href="/"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <span>View Public Site</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-3">
        <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold text-slate-900">
              {displayName || userEmail || "Administrator"}
            </span>
            <Badge variant="accent" className="shrink-0 uppercase text-[10px]">
              {role.replace("_", " ")}
            </Badge>
          </div>
          {userEmail && (
            <p className="truncate text-xs text-slate-500">{userEmail}</p>
          )}
          <p className="text-[11px] text-emerald-700 font-medium">
            AAL2 TOTP Verified
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full justify-start text-slate-700"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top toggle bar */}
      <div className="lg:hidden flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <Link
          href={`/admin/overview${querySuffix}`}
          className="flex items-center gap-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-slate-900">
            MetaSphere Admin
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white border-r border-slate-200 p-4 h-full overflow-y-auto">
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 border-r border-slate-200 bg-white p-4">
        {navContent}
      </aside>
    </>
  );
}
