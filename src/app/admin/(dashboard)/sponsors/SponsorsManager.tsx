"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Award, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import type { AdminRole, PublicationStatus, SponsorSnapshot } from "@/types/database";
import { canPerform } from "@/lib/permissions/rbac";
import {
  deleteSponsorAction,
  upsertSponsorAction,
} from "@/features/sponsors/actions";
import { AssetUploadWidget } from "@/components/admin/AssetUploadWidget";
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
import { Textarea } from "@/components/ui/textarea";

export interface SponsorsManagerProps {
  editionId: string;
  editionYear: number;
  sponsors: SponsorSnapshot[];
  actorRole: AdminRole;
  isFallbackRecord: boolean;
}

type SponsorTier =
  | "technical_sponsor"
  | "platinum"
  | "gold"
  | "silver"
  | "bronze"
  | "supporter";

export function SponsorsManager({
  editionId,
  editionYear,
  sponsors,
  actorRole,
  isFallbackRecord,
}: SponsorsManagerProps) {
  const router = useRouter();
  const canPublish = canPerform(actorRole, "publish_content");

  const [form, setForm] = useState<{
    id: string | null;
    name: string;
    tier: SponsorTier;
    logoUrl: string;
    websiteUrl: string;
    description: string;
    sortOrder: number;
    status: PublicationStatus;
  }>({
    id: null,
    name: "",
    tier: "technical_sponsor",
    logoUrl: "",
    websiteUrl: "",
    description: "",
    sortOrder: sponsors.length + 1,
    status: "draft",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await upsertSponsorAction(form.id, {
        editionId,
        editionYear,
        name: form.name,
        tier: form.tier,
        logoUrl: form.logoUrl,
        websiteUrl: form.websiteUrl,
        description: form.description,
        sortOrder: Number(form.sortOrder) || 0,
        status: canPublish ? form.status : "draft",
      });
      if (!res.ok) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      setFeedback({ type: "success", message: "Sponsor saved." });
      setForm({
        id: null,
        name: "",
        tier: "technical_sponsor",
        logoUrl: "",
        websiteUrl: "",
        description: "",
        sortOrder: sponsors.length + 2,
        status: "draft",
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {isFallbackRecord && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
        >
          Showing read-only seed fallback data. Connect Supabase first to persist edits.
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
            <Award className="h-4 w-4 text-orange-600" />
            {form.id ? "Edit Sponsor / Partner" : "Add Sponsor / Partner"}
          </CardTitle>
          <CardDescription>
            Keep existing Cloudinary logo URLs or upload a new partner logo (PNG/JPG/WEBP).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="sn-name">Organization Name</Label>
                <Input
                  id="sn-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sn-tier">Tier</Label>
                <Select
                  value={form.tier}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, tier: v as SponsorTier }))
                  }
                >
                  <SelectTrigger id="sn-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical_sponsor">Technical Sponsor</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="supporter">Supporter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sn-logoUrl">Logo URL (Required)</Label>
                <Input
                  id="sn-logoUrl"
                  type="url"
                  required
                  value={form.logoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://res.cloudinary.com/dh87hfwml/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sn-website">Website URL (Optional)</Label>
                <Input
                  id="sn-website"
                  type="url"
                  value={form.websiteUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, websiteUrl: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
            </div>

            <AssetUploadWidget
              editionYear={editionYear}
              disabled={isFallbackRecord}
              label="Optional: Upload New Partner Logo (PNG, JPG, WEBP)"
              onUploaded={({ url }) => setForm((f) => ({ ...f, logoUrl: url }))}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="sn-desc">Description (Optional)</Label>
                <Textarea
                  id="sn-desc"
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sn-sort">Sort Order</Label>
                  <Input
                    id="sn-sort"
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sn-status">Status</Label>
                  <Select
                    value={form.status}
                    disabled={!canPublish}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, status: v as PublicationStatus }))
                    }
                  >
                    <SelectTrigger id="sn-status">
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
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={submitting || isFallbackRecord}
            >
              <Plus className="h-4 w-4" />
              {form.id ? "Update Sponsor" : "Add Sponsor"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sponsors & Technical Partners ({sponsors.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {sponsors.map((sponsor) => (
            <div
              key={sponsor.id}
              className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                {sponsor.logoUrl && (
                  <img
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    className="h-12 w-20 rounded border border-slate-200 bg-white object-contain p-1 shrink-0"
                  />
                )}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{sponsor.name}</span>
                    <Badge variant="secondary" className="uppercase text-[10px]">
                      {sponsor.tier.replace("_", " ")}
                    </Badge>
                  </div>
                  {sponsor.websiteUrl && (
                    <a
                      href={sponsor.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-orange-700 hover:underline"
                    >
                      {sponsor.websiteUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <PublishControls
                  table="sponsors"
                  recordId={sponsor.id}
                  editionYear={editionYear}
                  currentStatus={sponsor.status}
                  actorRole={actorRole}
                  isFallbackRecord={isFallbackRecord}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isFallbackRecord}
                  onClick={() =>
                    setForm({
                      id: sponsor.id,
                      name: sponsor.name,
                      tier: (sponsor.tier as SponsorTier) || "technical_sponsor",
                      logoUrl: sponsor.logoUrl,
                      websiteUrl: sponsor.websiteUrl ?? "",
                      description: sponsor.description ?? "",
                      sortOrder: sponsor.sortOrder,
                      status: sponsor.status,
                    })
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    isFallbackRecord ||
                    (actorRole === "editor" && sponsor.status !== "draft")
                  }
                  onClick={async () => {
                    const r = await deleteSponsorAction(sponsor.id, editionYear);
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
        </CardContent>
      </Card>
    </div>
  );
}
