import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminPageSession } from "@/lib/auth/session";
import { loadAdminUsersData } from "@/lib/cms/admin-modules";
import { UsersManager } from "./UsersManager";

export const metadata: Metadata = {
  title: "Admin Users",
};

export default async function AdminUsersPage() {
  const actor = await requireAdminPageSession();
  if (actor.role !== "super_admin") {
    redirect("/admin/overview");
  }

  const data = await loadAdminUsersData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Administrator Users & RBAC
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Invite-only organizing committee accounts, role assignments, and financial approval grants.
        </p>
      </div>

      <UsersManager
        currentUserId={actor.userId}
        users={data.users}
        isFallbackRecord={data.source === "fallback"}
      />
    </div>
  );
}
