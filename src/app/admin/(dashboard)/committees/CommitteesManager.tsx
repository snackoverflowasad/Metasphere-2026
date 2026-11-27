"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import type {
  AdminRole,
  CommitteeCategory,
  CommitteeMemberSnapshot,
  CommitteeSnapshot,
  PublicationStatus,
} from "@/types/database";
import { canPerform } from "@/lib/permissions/rbac";
import {
  deleteCommitteeAction,
  deleteCommitteeMemberAction,
  upsertCommitteeAction,
  upsertCommitteeMemberAction,
} from "@/features/people/actions";
import { PublishControls } from "@/components/admin/PublishControls";
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

export interface CommitteesManagerProps {
  editionId: string;
  editionYear: number;
  committees: CommitteeSnapshot[];
  actorRole: AdminRole;
  isFallbackRecord: boolean;
}

export function CommitteesManager({
  editionId,
  editionYear,
  committees,
  actorRole,
  isFallbackRecord,
}: CommitteesManagerProps) {
  const router = useRouter();
  const canPublish = canPerform(actorRole, "publish_content");

  const [committeeForm, setCommitteeForm] = useState<{
    id: string | null;
    slug: string;
    name: string;
    category: CommitteeCategory;
    description: string;
    sortOrder: number;
    status: PublicationStatus;
  }>({
    id: null,
    slug: "",
    name: "",
    category: "advisory",
    description: "",
    sortOrder: committees.length + 1,
    status: "draft",
  });

  const [memberForm, setMemberForm] = useState<{
    id: string | null;
    committeeId: string;
    personId?: string;
    fullName: string;
    institution: string;
    roleLabel: string;
    groupName: string;
    nationalityGroup: "national" | "international";
    sortOrder: number;
    status: PublicationStatus;
  }>({
    id: null,
    committeeId: committees[0]?.id ?? "",
    personId: undefined,
    fullName: "",
    institution: "",
    roleLabel: "",
    groupName: "",
    nationalityGroup: "national",
    sortOrder: 0,
    status: "draft",
  });

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSaveCommittee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await upsertCommitteeAction(committeeForm.id, {
        editionId,
        editionYear,
        slug: committeeForm.slug,
        name: committeeForm.name,
        category: committeeForm.category,
        description: committeeForm.description,
        sortOrder: Number(committeeForm.sortOrder) || 0,
        status: canPublish ? committeeForm.status : "draft",
      });
      if (!res.ok) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      setFeedback({ type: "success", message: "Committee saved." });
      setCommitteeForm({
        id: null,
        slug: "",
        name: "",
        category: "advisory",
        description: "",
        sortOrder: committees.length + 2,
        status: "draft",
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await upsertCommitteeMemberAction(memberForm.id, {
        committeeId: memberForm.committeeId,
        editionId,
        editionYear,
        personId: memberForm.personId,
        fullName: memberForm.fullName,
        institution: memberForm.institution,
        roleLabel: memberForm.roleLabel,
        groupName: memberForm.groupName,
        nationalityGroup: memberForm.nationalityGroup,
        sortOrder: Number(memberForm.sortOrder) || 0,
        status: canPublish ? memberForm.status : "draft",
      });
      if (!res.ok) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      setFeedback({ type: "success", message: "Committee member saved." });
      setMemberForm((m) => ({
        ...m,
        id: null,
        personId: undefined,
        fullName: "",
        institution: "",
        roleLabel: "",
        groupName: "",
        sortOrder: m.sortOrder + 1,
        status: "draft",
      }));
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMember = (
    committeeId: string,
    member: CommitteeMemberSnapshot
  ) => {
    setFeedback(null);
    setMemberForm({
      id: member.id,
      committeeId,
      personId: member.personId,
      fullName: member.fullName,
      institution: member.affiliation,
      roleLabel: member.roleLabel,
      groupName: member.groupName,
      nationalityGroup: member.nationalityGroup,
      sortOrder: member.sortOrder,
      status: member.status,
    });
  };

  return (
    <div className="space-y-6">
      {isFallbackRecord && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
        >
          Showing read-only seed fallback data. Connect Supabase first (see{" "}
          <span className="font-mono">docs/operations/supabase-handoff.md</span>) to
          persist edits.
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600" />
              {committeeForm.id ? "Edit Committee" : "Add Committee"}
            </CardTitle>
            <CardDescription>
              Advisory, scientific, technical, AAIA, or organizing committee sections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveCommittee} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cm-name">Committee Name</Label>
                  <Input
                    id="cm-name"
                    required
                    value={committeeForm.name}
                    onChange={(e) =>
                      setCommitteeForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cm-slug">Slug</Label>
                  <Input
                    id="cm-slug"
                    required
                    value={committeeForm.slug}
                    onChange={(e) =>
                      setCommitteeForm((f) => ({
                        ...f,
                        slug: e.target.value.toLowerCase(),
                      }))
                    }
                    placeholder="advisory-committee"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cm-category">Category</Label>
                  <Select
                    value={committeeForm.category}
                    onValueChange={(v) =>
                      setCommitteeForm((f) => ({
                        ...f,
                        category: v as CommitteeCategory,
                      }))
                    }
                  >
                    <SelectTrigger id="cm-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advisory">Advisory</SelectItem>
                      <SelectItem value="scientific">Scientific</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="aaia">AAIA</SelectItem>
                      <SelectItem value="organizing">Organizing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cm-sort">Sort Order</Label>
                  <Input
                    id="cm-sort"
                    type="number"
                    min={0}
                    value={committeeForm.sortOrder}
                    onChange={(e) =>
                      setCommitteeForm((f) => ({
                        ...f,
                        sortOrder: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cm-status">Status</Label>
                  <Select
                    value={committeeForm.status}
                    disabled={!canPublish}
                    onValueChange={(v) =>
                      setCommitteeForm((f) => ({
                        ...f,
                        status: v as PublicationStatus,
                      }))
                    }
                  >
                    <SelectTrigger id="cm-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={submitting || isFallbackRecord}
              >
                <Plus className="h-4 w-4" />
                {committeeForm.id ? "Update Committee" : "Create Committee"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {memberForm.id ? "Edit Committee Member" : "Add Committee Member"}
            </CardTitle>
            <CardDescription>
              Assign national or international designation pills per member.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveMember} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mb-committee">Committee</Label>
                  <Select
                    value={memberForm.committeeId}
                    onValueChange={(v) =>
                      setMemberForm((f) => ({ ...f, committeeId: v }))
                    }
                  >
                    <SelectTrigger id="mb-committee">
                      <SelectValue placeholder="Select committee" />
                    </SelectTrigger>
                    <SelectContent>
                      {committees.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mb-nat">Nationality Group</Label>
                  <Select
                    value={memberForm.nationalityGroup}
                    onValueChange={(v) =>
                      setMemberForm((f) => ({
                        ...f,
                        nationalityGroup: v as "national" | "international",
                      }))
                    }
                  >
                    <SelectTrigger id="mb-nat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national">National (India)</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mb-name">Full Name</Label>
                  <Input
                    id="mb-name"
                    required
                    value={memberForm.fullName}
                    onChange={(e) =>
                      setMemberForm((f) => ({ ...f, fullName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mb-inst">Institution / Affiliation</Label>
                  <Input
                    id="mb-inst"
                    value={memberForm.institution}
                    onChange={(e) =>
                      setMemberForm((f) => ({ ...f, institution: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mb-role">Role Label</Label>
                  <Input
                    id="mb-role"
                    value={memberForm.roleLabel}
                    onChange={(e) =>
                      setMemberForm((f) => ({ ...f, roleLabel: e.target.value }))
                    }
                    placeholder="General Chair"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mb-group">Group Name</Label>
                  <Input
                    id="mb-group"
                    value={memberForm.groupName}
                    onChange={(e) =>
                      setMemberForm((f) => ({ ...f, groupName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mb-sort">Sort Order</Label>
                  <Input
                    id="mb-sort"
                    type="number"
                    min={0}
                    value={memberForm.sortOrder}
                    onChange={(e) =>
                      setMemberForm((f) => ({
                        ...f,
                        sortOrder: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={submitting || isFallbackRecord || !memberForm.committeeId}
              >
                <Plus className="h-4 w-4" />
                {memberForm.id ? "Update Member" : "Add Member"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {committees.map((committee) => (
          <Card key={committee.id}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{committee.name}</CardTitle>
                  <Badge variant="secondary" className="uppercase text-[10px]">
                    {committee.category}
                  </Badge>
                </div>
                <CardDescription>
                  Slug: <span className="font-mono">{committee.slug}</span> •{" "}
                  {committee.members.length} members
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PublishControls
                  table="committees"
                  recordId={committee.id}
                  editionYear={editionYear}
                  currentStatus={committee.status}
                  actorRole={actorRole}
                  isFallbackRecord={isFallbackRecord}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    isFallbackRecord ||
                    (actorRole === "editor" && committee.status !== "draft")
                  }
                  onClick={async () => {
                    const r = await deleteCommitteeAction(committee.id, editionYear);
                    if (!r.ok) setFeedback({ type: "error", message: r.error });
                    else router.refresh();
                  }}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {committee.members.length === 0 ? (
                <p className="text-sm text-slate-500">No members in this committee yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {committee.members.map((member) => (
                    <div
                      key={member.id}
                      className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900 text-sm">
                            {member.fullName}
                          </span>
                          <span
                            className={
                              member.nationalityGroup === "national"
                                ? "inline-flex items-center rounded-full bg-[#f97316] px-2 py-0.5 text-[10px] font-semibold text-white"
                                : "inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                            }
                          >
                            {member.nationalityGroup === "national"
                              ? "National (India)"
                              : "International"}
                          </span>
                          {member.roleLabel && (
                            <span className="text-xs text-slate-500">
                              {member.roleLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">{member.affiliation}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <PublishControls
                          table="committee_members"
                          recordId={member.id}
                          editionYear={editionYear}
                          currentStatus={member.status}
                          actorRole={actorRole}
                          isFallbackRecord={isFallbackRecord}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isFallbackRecord}
                          onClick={() => handleEditMember(committee.id, member)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={
                            isFallbackRecord ||
                            (actorRole === "editor" && member.status !== "draft")
                          }
                          onClick={async () => {
                            const r = await deleteCommitteeMemberAction(
                              member.id,
                              editionYear
                            );
                            if (!r.ok) setFeedback({ type: "error", message: r.error });
                            else router.refresh();
                          }}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
