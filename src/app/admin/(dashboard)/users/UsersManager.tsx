"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldAlert, UserCog, UserPlus } from "lucide-react";
import type { AdminRole } from "@/types/database";
import type { AdminUserRecord } from "@/lib/cms/admin-modules";
import {
  deactivateAdminUserAction,
  inviteAdminUserAction,
  updateAdminRoleAction,
} from "@/features/admin-users/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface UsersManagerProps {
  currentUserId: string;
  users: AdminUserRecord[];
  isFallbackRecord: boolean;
}

export function UsersManager({
  currentUserId,
  users,
  isFallbackRecord,
}: UsersManagerProps) {
  const router = useRouter();
  const [inviteForm, setInviteForm] = useState<{
    email: string;
    displayName: string;
    role: AdminRole;
    canApproveFinancial: boolean;
  }>({
    email: "",
    displayName: "",
    role: "editor",
    canApproveFinancial: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await inviteAdminUserAction(inviteForm);
      if (!res.ok) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      setFeedback({
        type: "success",
        message: `Invite sent to ${inviteForm.email}.`,
      });
      setInviteForm({
        email: "",
        displayName: "",
        role: "editor",
        canApproveFinancial: false,
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleToggle = async (
    user: AdminUserRecord,
    updates: Partial<{
      role: AdminRole;
      canApproveFinancial: boolean;
      isActive: boolean;
    }>
  ) => {
    setFeedback(null);
    const res = await updateAdminRoleAction({
      userId: user.userId,
      displayName: user.displayName ?? "",
      role: updates.role ?? user.role,
      canApproveFinancial:
        updates.canApproveFinancial ?? user.canApproveFinancial,
      isActive: updates.isActive ?? user.isActive,
    });
    if (!res.ok) {
      setFeedback({ type: "error", message: res.error });
      return;
    }
    setFeedback({ type: "success", message: "Administrator permissions updated." });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {isFallbackRecord && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
        >
          Supabase is not connected yet. Invitations require{" "}
          <span className="font-mono">SUPABASE_SECRET_KEY</span> on the server.
        </div>
      )}

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={
            feedback.type === "error"
              ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          }
        >
          {feedback.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-orange-600" />
            Invite Committee Administrator
          </CardTitle>
          <CardDescription>
            Public signup is disabled. New admins receive an email invite and must
            complete TOTP MFA setup before accessing the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="au-email">Email</Label>
                <Input
                  id="au-email"
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="coordinator@iem.edu.in"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="au-name">Display Name (Optional)</Label>
                <Input
                  id="au-name"
                  value={inviteForm.displayName}
                  onChange={(e) =>
                    setInviteForm((f) => ({ ...f, displayName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="au-role">Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(v) =>
                    setInviteForm((f) => ({ ...f, role: v as AdminRole }))
                  }
                >
                  <SelectTrigger id="au-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor (Drafts only)</SelectItem>
                    <SelectItem value="content_admin">Content Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={inviteForm.canApproveFinancial}
                onChange={(e) =>
                  setInviteForm((f) => ({
                    ...f,
                    canApproveFinancial: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-orange-600"
              />
              Grant Financial Approval permission (registration fees & bank details)
            </label>

            <Button
              type="submit"
              variant="primary"
              disabled={submitting || isFallbackRecord}
            >
              <UserPlus className="h-4 w-4" />
              {submitting ? "Inviting..." : "Send Admin Invite"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-slate-600" />
            Administrator Directory ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {users.length === 0 ? (
            <p className="text-sm text-slate-500">
              No administrator role records found in this environment.
            </p>
          ) : (
            users.map((user) => {
              const isSelf = user.userId === currentUserId;
              return (
                <div
                  key={user.userId}
                  className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {user.displayName || user.email || user.userId}
                      </span>
                      <Badge variant="accent" className="uppercase text-[10px]">
                        {user.role.replace("_", " ")}
                      </Badge>
                      <Badge variant={user.isActive ? "published" : "archived"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {isSelf && <Badge variant="secondary">You</Badge>}
                    </div>
                    {user.email && (
                      <p className="text-xs text-slate-500">{user.email}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Select
                      value={user.role}
                      disabled={isSelf || isFallbackRecord}
                      onValueChange={(v) =>
                        handleRoleToggle(user, { role: v as AdminRole })
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="content_admin">Content Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    <label className="flex items-center gap-1.5 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={user.canApproveFinancial}
                        disabled={isFallbackRecord}
                        onChange={(e) =>
                          handleRoleToggle(user, {
                            canApproveFinancial: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-orange-600"
                      />
                      Financial
                    </label>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSelf || !user.isActive || isFallbackRecord}
                      onClick={async () => {
                        const r = await deactivateAdminUserAction(user.userId);
                        if (!r.ok) setFeedback({ type: "error", message: r.error });
                        else router.refresh();
                      }}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Deactivate
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
