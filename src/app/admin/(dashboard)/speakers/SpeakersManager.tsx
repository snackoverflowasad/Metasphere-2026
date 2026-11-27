"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mic2, Pencil, Plus, Trash2 } from "lucide-react";
import type { AdminRole, PublicationStatus, SpeakerSnapshot } from "@/types/database";
import { canPerform } from "@/lib/permissions/rbac";
import {
  deleteSpeakerAction,
  upsertSpeakerAction,
} from "@/features/people/actions";
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

export interface SpeakersManagerProps {
  editionId: string;
  editionYear: number;
  speakers: SpeakerSnapshot[];
  actorRole: AdminRole;
  isFallbackRecord: boolean;
}

interface SpeakerFormState {
  id: string | null;
  personId?: string;
  fullName: string;
  designation: string;
  institution: string;
  country: string;
  photoUrl: string;
  imageAlt: string;
  speakerType: string;
  talkTitle: string;
  talkAbstract: string;
  sortOrder: number;
  status: PublicationStatus;
}

const EMPTY_FORM: SpeakerFormState = {
  id: null,
  personId: undefined,
  fullName: "",
  designation: "",
  institution: "",
  country: "",
  photoUrl: "",
  imageAlt: "",
  speakerType: "keynote",
  talkTitle: "",
  talkAbstract: "",
  sortOrder: 0,
  status: "draft",
};

export function SpeakersManager({
  editionId,
  editionYear,
  speakers,
  actorRole,
  isFallbackRecord,
}: SpeakersManagerProps) {
  const router = useRouter();
  const canPublish = canPerform(actorRole, "publish_content");
  const [form, setForm] = useState<SpeakerFormState>({
    ...EMPTY_FORM,
    sortOrder: speakers.length + 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleEdit = (speaker: SpeakerSnapshot) => {
    setFeedback(null);
    setForm({
      id: speaker.id,
      personId: speaker.personId,
      fullName: speaker.fullName,
      designation: speaker.designation,
      institution: speaker.institution,
      country: speaker.country ?? "",
      photoUrl: speaker.photoUrl,
      imageAlt: speaker.imageAlt,
      speakerType: speaker.speakerType,
      talkTitle: speaker.talkTitle ?? "",
      talkAbstract: speaker.talkAbstract ?? "",
      sortOrder: speaker.sortOrder,
      status: speaker.status,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const result = await upsertSpeakerAction(form.id, {
        editionId,
        editionYear,
        personId: form.personId,
        fullName: form.fullName,
        designation: form.designation,
        institution: form.institution,
        country: form.country,
        photoUrl: form.photoUrl,
        imageAlt: form.imageAlt || form.fullName,
        speakerType: form.speakerType,
        talkTitle: form.talkTitle,
        talkAbstract: form.talkAbstract,
        sortOrder: Number(form.sortOrder) || 0,
        status: canPublish ? form.status : "draft",
      });
      if (!result.ok) {
        setFeedback({ type: "error", message: result.error });
        return;
      }
      setFeedback({
        type: "success",
        message: form.id ? "Speaker updated." : "Speaker added.",
      });
      setForm({ ...EMPTY_FORM, sortOrder: speakers.length + 2 });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (speaker: SpeakerSnapshot) => {
    setFeedback(null);
    const result = await deleteSpeakerAction(speaker.id, editionYear);
    if (!result.ok) {
      setFeedback({ type: "error", message: result.error });
      return;
    }
    if (form.id === speaker.id) {
      setForm({ ...EMPTY_FORM, sortOrder: speakers.length });
    }
    setFeedback({ type: "success", message: `Deleted "${speaker.fullName}".` });
    router.refresh();
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic2 className="h-4 w-4 text-orange-600" />
            {form.id ? "Edit Speaker" : "Add Speaker"}
          </CardTitle>
          <CardDescription>
            Preserve existing Cloudinary URLs or upload a new headshot to Supabase Storage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sp-fullName">Full Name</Label>
                <Input
                  id="sp-fullName"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-designation">Designation / Role</Label>
                <Input
                  id="sp-designation"
                  value={form.designation}
                  onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
                  placeholder="Professor, Department of CSE"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="sp-institution">Institution / Affiliation</Label>
                <Input
                  id="sp-institution"
                  value={form.institution}
                  onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-country">Country</Label>
                <Input
                  id="sp-country"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  placeholder="India / USA"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sp-photoUrl">Photo URL (Cloudinary or Storage)</Label>
                <Input
                  id="sp-photoUrl"
                  type="url"
                  value={form.photoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
                  placeholder="https://res.cloudinary.com/dh87hfwml/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-imageAlt">Photo Alt Text</Label>
                <Input
                  id="sp-imageAlt"
                  value={form.imageAlt}
                  onChange={(e) => setForm((f) => ({ ...f, imageAlt: e.target.value }))}
                />
              </div>
            </div>

            <AssetUploadWidget
              editionYear={editionYear}
              disabled={isFallbackRecord}
              label="Optional: Upload New Speaker Photo (PNG, JPG, WEBP)"
              onUploaded={({ url }) => setForm((f) => ({ ...f, photoUrl: url }))}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="sp-type">Speaker Type</Label>
                <Select
                  value={form.speakerType}
                  onValueChange={(value) => setForm((f) => ({ ...f, speakerType: value }))}
                >
                  <SelectTrigger id="sp-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keynote">Keynote</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                    <SelectItem value="plenary">Plenary</SelectItem>
                    <SelectItem value="tutorial">Tutorial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-sort">Sort Order</Label>
                <Input
                  id="sp-sort"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-status">Status</Label>
                <Select
                  value={form.status}
                  disabled={!canPublish}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, status: value as PublicationStatus }))
                  }
                >
                  <SelectTrigger id="sp-status">
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
              <Label htmlFor="sp-talkTitle">Talk Title (optional)</Label>
              <Input
                id="sp-talkTitle"
                value={form.talkTitle}
                onChange={(e) => setForm((f) => ({ ...f, talkTitle: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sp-talkAbstract">Talk Abstract (optional)</Label>
              <Textarea
                id="sp-talkAbstract"
                rows={3}
                value={form.talkAbstract}
                onChange={(e) => setForm((f) => ({ ...f, talkAbstract: e.target.value }))}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || isFallbackRecord}
              >
                <Plus className="h-4 w-4" />
                {isSubmitting
                  ? "Saving..."
                  : form.id
                    ? "Save Speaker Changes"
                    : "Add Speaker"}
              </Button>
              {form.id && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setForm({ ...EMPTY_FORM, sortOrder: speakers.length + 1 })
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
          <CardTitle>Speakers ({speakers.length})</CardTitle>
          <CardDescription>Ordered by display sort order.</CardDescription>
        </CardHeader>
        <CardContent>
          {speakers.length === 0 ? (
            <p className="text-sm text-slate-500">No speakers configured for this edition yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {speakers.map((speaker) => (
                <div
                  key={speaker.id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    {speaker.photoUrl ? (
                      <img
                        src={speaker.photoUrl}
                        alt={speaker.imageAlt || speaker.fullName}
                        className="h-12 w-12 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0">
                        {speaker.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {speaker.fullName}
                        </span>
                        {speaker.speakerType === "keynote" && (
                          <Badge variant="accent">Keynote</Badge>
                        )}
                        <span className="text-xs text-slate-400">#{speaker.sortOrder}</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {[speaker.designation, speaker.institution, speaker.country]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                      {speaker.talkTitle && (
                        <p className="text-xs text-slate-500 italic">
                          Talk: {speaker.talkTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <PublishControls
                      table="speakers"
                      recordId={speaker.id}
                      editionYear={editionYear}
                      currentStatus={speaker.status}
                      actorRole={actorRole}
                      isFallbackRecord={isFallbackRecord}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isFallbackRecord}
                      onClick={() => handleEdit(speaker)}
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
                        (actorRole === "editor" && speaker.status !== "draft")
                      }
                      onClick={() => handleDelete(speaker)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
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
    </div>
  );
}
