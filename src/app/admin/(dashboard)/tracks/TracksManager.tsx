"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import type { AdminRole, PublicationStatus, TrackSnapshot } from "@/types/database";
import { canPerform } from "@/lib/permissions/rbac";
import { deleteTrackAction, upsertTrackAction } from "@/features/programme/actions";
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

export interface TracksManagerProps {
  editionId: string;
  editionYear: number;
  tracks: TrackSnapshot[];
  actorRole: AdminRole;
  isFallbackRecord: boolean;
}

export function TracksManager({
  editionId,
  editionYear,
  tracks,
  actorRole,
  isFallbackRecord,
}: TracksManagerProps) {
  const router = useRouter();
  const canPublish = canPerform(actorRole, "publish_content");

  const [form, setForm] = useState<{
    id: string | null;
    code: string;
    name: string;
    description: string;
    topicsText: string;
    imageUrl: string;
    sortOrder: number;
    status: PublicationStatus;
  }>({
    id: null,
    code: "",
    name: "",
    description: "",
    topicsText: "",
    imageUrl: "",
    sortOrder: tracks.length + 1,
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
      const topics = form.topicsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const res = await upsertTrackAction(form.id, {
        editionId,
        editionYear,
        code: form.code,
        name: form.name,
        description: form.description,
        topics,
        imageUrl: form.imageUrl,
        sortOrder: Number(form.sortOrder) || 0,
        status: canPublish ? form.status : "draft",
      });
      if (!res.ok) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      setFeedback({ type: "success", message: "Track saved." });
      setForm({
        id: null,
        code: "",
        name: "",
        description: "",
        topicsText: "",
        imageUrl: "",
        sortOrder: tracks.length + 2,
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
            <Layers className="h-4 w-4 text-orange-600" />
            {form.id ? "Edit CFP Track" : "Add CFP Track"}
          </CardTitle>
          <CardDescription>
            Manage Call for Papers research tracks, topic lists, and track artwork URLs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="tr-code">Track Code</Label>
                <Input
                  id="tr-code"
                  required
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Track 1"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="tr-name">Track Name</Label>
                <Input
                  id="tr-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tr-sort">Sort Order</Label>
                <Input
                  id="tr-sort"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="tr-imageUrl">Track Cover Image URL</Label>
                <Input
                  id="tr-imageUrl"
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://res.cloudinary.com/dh87hfwml/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tr-status">Status</Label>
                <Select
                  value={form.status}
                  disabled={!canPublish}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as PublicationStatus }))
                  }
                >
                  <SelectTrigger id="tr-status">
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

            <div className="space-y-1.5">
              <Label htmlFor="tr-desc">Description</Label>
              <Textarea
                id="tr-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tr-topics">Topics (one per line)</Label>
              <Textarea
                id="tr-topics"
                rows={4}
                value={form.topicsText}
                onChange={(e) => setForm((f) => ({ ...f, topicsText: e.target.value }))}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={submitting || isFallbackRecord}
              >
                <Plus className="h-4 w-4" />
                {form.id ? "Update Track" : "Add Track"}
              </Button>
              {form.id && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      id: null,
                      code: "",
                      name: "",
                      description: "",
                      topicsText: "",
                      imageUrl: "",
                      sortOrder: tracks.length + 1,
                      status: "draft",
                    })
                  }
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tracks ({tracks.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="py-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent">{track.code}</Badge>
                  <span className="font-semibold text-slate-900">{track.name}</span>
                  <span className="text-xs text-slate-400">#{track.sortOrder}</span>
                </div>
                {track.description && (
                  <p className="text-xs text-slate-600">{track.description}</p>
                )}
                <p className="text-xs text-slate-500">
                  {track.topics.length} research topics
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PublishControls
                  table="tracks"
                  recordId={track.id}
                  editionYear={editionYear}
                  currentStatus={track.status}
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
                      id: track.id,
                      code: track.code,
                      name: track.name,
                      description: track.description,
                      topicsText: track.topics.join("\n"),
                      imageUrl: track.imageUrl ?? "",
                      sortOrder: track.sortOrder,
                      status: track.status,
                    })
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={
                    isFallbackRecord ||
                    (actorRole === "editor" && track.status !== "draft")
                  }
                  onClick={async () => {
                    const r = await deleteTrackAction(track.id, editionYear);
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
