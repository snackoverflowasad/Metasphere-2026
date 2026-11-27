"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import type {
  AdminRole,
  ProgramSessionSnapshot,
  PublicationStatus,
  SpeakerSnapshot,
  TrackSnapshot,
} from "@/types/database";
import {
  formatIstDateTime,
  fromIstDateTimeLocalValue,
  toIstDateTimeLocalValue,
} from "@/lib/dates/ist";
import { canPerform } from "@/lib/permissions/rbac";
import {
  deleteSessionAction,
  upsertSessionAction,
} from "@/features/programme/actions";
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

export interface ProgrammeManagerProps {
  editionId: string;
  editionYear: number;
  sessions: ProgramSessionSnapshot[];
  tracks: TrackSnapshot[];
  speakers: SpeakerSnapshot[];
  actorRole: AdminRole;
  isFallbackRecord: boolean;
}

export function ProgrammeManager({
  editionId,
  editionYear,
  sessions,
  tracks,
  speakers,
  actorRole,
  isFallbackRecord,
}: ProgrammeManagerProps) {
  const router = useRouter();
  const canPublish = canPerform(actorRole, "publish_content");

  const trackById = new Map(tracks.map((t) => [t.id, t]));
  const speakerById = new Map(speakers.map((s) => [s.id, s]));

  const [form, setForm] = useState<{
    id: string | null;
    title: string;
    trackId: string;
    speakerId: string;
    startsAtLocal: string;
    endsAtLocal: string;
    roomOrLink: string;
    description: string;
    sortOrder: number;
    status: PublicationStatus;
  }>({
    id: null,
    title: "",
    trackId: "none",
    speakerId: "none",
    startsAtLocal: `${editionYear}-08-17T09:30`,
    endsAtLocal: `${editionYear}-08-17T10:30`,
    roomOrLink: "",
    description: "",
    sortOrder: sessions.length + 1,
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
      const startsAt = fromIstDateTimeLocalValue(form.startsAtLocal);
      const endsAt = fromIstDateTimeLocalValue(form.endsAtLocal);

      const res = await upsertSessionAction(form.id, {
        editionId,
        editionYear,
        trackId: form.trackId === "none" ? null : form.trackId,
        speakerId: form.speakerId === "none" ? null : form.speakerId,
        startsAt,
        endsAt,
        title: form.title,
        description: form.description,
        roomOrLink: form.roomOrLink,
        sortOrder: Number(form.sortOrder) || 0,
        status: canPublish ? form.status : "draft",
      });
      if (!res.ok) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      setFeedback({ type: "success", message: "Program session saved." });
      setForm((f) => ({
        ...f,
        id: null,
        title: "",
        roomOrLink: "",
        description: "",
        sortOrder: sessions.length + 2,
        status: "draft",
      }));
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
            <CalendarDays className="h-4 w-4 text-orange-600" />
            {form.id ? "Edit Program Session" : "Add Program Session"}
          </CardTitle>
          <CardDescription>
            All session times are stored and displayed in IST (Asia/Kolkata, UTC+5:30).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="ps-title">Session Title</Label>
                <Input
                  id="ps-title"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ps-room">Room / Link</Label>
                <Input
                  id="ps-room"
                  value={form.roomOrLink}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, roomOrLink: e.target.value }))
                  }
                  placeholder="Main Auditorium"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ps-start">Starts At (IST)</Label>
                <Input
                  id="ps-start"
                  type="datetime-local"
                  required
                  value={form.startsAtLocal}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startsAtLocal: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ps-end">Ends At (IST)</Label>
                <Input
                  id="ps-end"
                  type="datetime-local"
                  required
                  value={form.endsAtLocal}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endsAtLocal: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="ps-track">Track (optional)</Label>
                <Select
                  value={form.trackId}
                  onValueChange={(v) => setForm((f) => ({ ...f, trackId: v }))}
                >
                  <SelectTrigger id="ps-track">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General / Plenary</SelectItem>
                    {tracks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.code}: {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ps-speaker">Speaker (optional)</Label>
                <Select
                  value={form.speakerId}
                  onValueChange={(v) => setForm((f) => ({ ...f, speakerId: v }))}
                >
                  <SelectTrigger id="ps-speaker">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {speakers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ps-sort">Sort Order</Label>
                <Input
                  id="ps-sort"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ps-status">Status</Label>
                <Select
                  value={form.status}
                  disabled={!canPublish}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as PublicationStatus }))
                  }
                >
                  <SelectTrigger id="ps-status">
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
              <Label htmlFor="ps-desc">Description</Label>
              <Textarea
                id="ps-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={submitting || isFallbackRecord}
            >
              <Plus className="h-4 w-4" />
              {form.id ? "Update Session" : "Add Session"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Sessions ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {sessions.length === 0 ? (
            <p className="text-sm text-slate-500">No programme sessions added yet.</p>
          ) : (
            sessions.map((session) => {
              const track = session.trackId ? trackById.get(session.trackId) : null;
              const speaker = session.speakerId
                ? speakerById.get(session.speakerId)
                : null;
              return (
                <div
                  key={session.id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{session.title}</span>
                      {track && <Badge variant="accent">{track.code}</Badge>}
                      {session.roomOrLink && (
                        <Badge variant="secondary">{session.roomOrLink}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      {formatIstDateTime(session.startsAt)} →{" "}
                      {formatIstDateTime(session.endsAt)}
                    </p>
                    {speaker && (
                      <p className="text-xs text-slate-500">
                        Speaker: {speaker.fullName}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <PublishControls
                      table="program_sessions"
                      recordId={session.id}
                      editionYear={editionYear}
                      currentStatus={session.status}
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
                          id: session.id,
                          title: session.title,
                          trackId: session.trackId ?? "none",
                          speakerId: session.speakerId ?? "none",
                          startsAtLocal: toIstDateTimeLocalValue(session.startsAt),
                          endsAtLocal: toIstDateTimeLocalValue(session.endsAt),
                          roomOrLink: session.roomOrLink ?? "",
                          description: session.description ?? "",
                          sortOrder: session.sortOrder,
                          status: session.status,
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
                        (actorRole === "editor" && session.status !== "draft")
                      }
                      onClick={async () => {
                        const r = await deleteSessionAction(session.id, editionYear);
                        if (!r.ok) setFeedback({ type: "error", message: r.error });
                        else router.refresh();
                      }}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
