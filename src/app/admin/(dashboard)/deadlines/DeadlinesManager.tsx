"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import type { AdminRole, DeadlineSnapshot, PublicationStatus } from "@/types/database";
import {
  formatIstDateTime,
  fromIstDateTimeLocalValue,
  toIstDateTimeLocalValue,
} from "@/lib/dates/ist";
import { canPerform } from "@/lib/permissions/rbac";
import { publicationStatusSchema } from "@/lib/validation/common";
import {
  deleteDeadlineAction,
  upsertDeadlineAction,
} from "@/features/deadlines/actions";
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

const deadlineFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, "Deadline title is required").max(160),
  dueAtLocal: z.string().trim().min(1, "Due date & time (IST) is required"),
  displayDate: z.string().trim().min(2, "Display date is required").max(120),
  originalDate: z.string().trim().max(120),
  isExtended: z.boolean(),
  isConferenceDate: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
  isVisible: z.boolean(),
  status: publicationStatusSchema,
});

type DeadlineFormValues = z.infer<typeof deadlineFormSchema>;

export interface DeadlinesManagerProps {
  editionId: string;
  editionYear: number;
  deadlines: DeadlineSnapshot[];
  actorRole: AdminRole;
  isFallbackRecord: boolean;
}

export function DeadlinesManager({
  editionId,
  editionYear,
  deadlines,
  actorRole,
  isFallbackRecord,
}: DeadlinesManagerProps) {
  const router = useRouter();
  const canPublish = canPerform(actorRole, "publish_content");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const emptyDefaults: DeadlineFormValues = {
    id: undefined,
    title: "",
    dueAtLocal: `${editionYear}-06-15T23:59`,
    displayDate: "",
    originalDate: "",
    isExtended: false,
    isConferenceDate: false,
    sortOrder: deadlines.length + 1,
    isVisible: true,
    status: "draft",
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeadlineFormValues>({
    resolver: zodResolver(deadlineFormSchema),
    defaultValues: emptyDefaults,
  });

  const handleEdit = (deadline: DeadlineSnapshot) => {
    setFeedback(null);
    setEditingId(deadline.id);
    reset({
      id: deadline.id.startsWith("fallback-") ? undefined : deadline.id,
      title: deadline.title,
      dueAtLocal: toIstDateTimeLocalValue(deadline.dueAt),
      displayDate: deadline.displayDate,
      originalDate: deadline.originalDate ?? "",
      isExtended: deadline.isExtended,
      isConferenceDate: deadline.isConferenceDate,
      sortOrder: deadline.sortOrder,
      isVisible: deadline.isVisible,
      status: canPublish ? deadline.status : "draft",
    });
  };

  const handleReset = () => {
    setEditingId(null);
    reset(emptyDefaults);
  };

  const onSubmit = async (values: DeadlineFormValues) => {
    setFeedback(null);
    const targetStatus: PublicationStatus = canPublish
      ? values.status
      : "draft";

    const result = await upsertDeadlineAction({
      id: values.id,
      editionId,
      editionYear,
      title: values.title,
      dueAt: fromIstDateTimeLocalValue(values.dueAtLocal),
      displayDate: values.displayDate,
      originalDate: values.originalDate || null,
      isExtended: values.isExtended,
      isConferenceDate: values.isConferenceDate,
      sortOrder: values.sortOrder,
      isVisible: values.isVisible,
      status: targetStatus,
    });

    if (!result.ok) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    setFeedback({
      type: "success",
      message: values.id
        ? "Deadline updated in IST (UTC+5:30)."
        : "New deadline saved.",
    });
    handleReset();
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    setFeedback(null);
    const result = await deleteDeadlineAction(id, editionYear);
    if (!result.ok) {
      setFeedback({ type: "error", message: result.error });
      return;
    }
    setFeedback({ type: "success", message: "Deadline deleted." });
    if (editingId === id) {
      handleReset();
    }
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Important Dates & Deadlines — {editionYear}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage Call for Papers deadlines, extended dates, and conference start
          countdowns in <span className="font-semibold">IST (UTC+5:30)</span>.
        </p>
      </div>

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={
            feedback.type === "error"
              ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          }
        >
          {feedback.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-orange-600" />
            {editingId ? "Edit Deadline" : "Add New Deadline"}
          </CardTitle>
          <CardDescription>
            Enter date & time in Asia/Kolkata (IST UTC+5:30).{" "}
            {!canPublish && "Editors create and edit draft deadlines only."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="deadline-title">Milestone Title</Label>
              <Input
                id="deadline-title"
                placeholder="Full paper submission"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deadline-due">
                Due Date & Time (IST UTC+5:30)
              </Label>
              <Input
                id="deadline-due"
                type="datetime-local"
                {...register("dueAtLocal")}
              />
              {errors.dueAtLocal && (
                <p className="text-xs text-red-600">
                  {errors.dueAtLocal.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deadline-display">Public Display Label</Label>
              <Input
                id="deadline-display"
                placeholder="31st May, 2027"
                {...register("displayDate")}
              />
              {errors.displayDate && (
                <p className="text-xs text-red-600">
                  {errors.displayDate.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deadline-original">
                Original Date (if extended)
              </Label>
              <Input
                id="deadline-original"
                placeholder="15th May, 2027"
                {...register("originalDate")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deadline-sort">Sort Order</Label>
              <Input
                id="deadline-sort"
                type="number"
                min={0}
                {...register("sortOrder", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deadline-status">Publication Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={canPublish ? field.value : "draft"}
                    onValueChange={field.onChange}
                    disabled={!canPublish}
                  >
                    <SelectTrigger id="deadline-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="sm:col-span-2 flex flex-wrap gap-6 pt-1 text-sm text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-orange-600"
                  {...register("isExtended")}
                />
                <span>Mark as Extended (strike-through original date)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-orange-600"
                  {...register("isConferenceDate")}
                />
                <span>Primary Conference Date (drives homepage countdown)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-orange-600"
                  {...register("isVisible")}
                />
                <span>Visible on public timelines</span>
              </label>
            </div>

            <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
              {editingId && (
                <Button type="button" variant="outline" onClick={handleReset}>
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : editingId
                    ? "Update Deadline"
                    : "Save Deadline"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-orange-600" />
            Configured Deadlines ({deadlines.length})
          </CardTitle>
          <CardDescription>
            Ordered by <code className="font-mono">sort_order</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {deadlines.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">
              No deadlines configured for {editionYear}.
            </p>
          ) : (
            deadlines.map((deadline) => {
              const isFallback = deadline.id.startsWith("fallback-");
              const canDelete =
                !isFallback &&
                (canPublish || deadline.status === "draft");

              return (
                <div
                  key={deadline.id}
                  className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">
                        #{deadline.sortOrder}
                      </span>
                      <h4 className="font-semibold text-slate-900">
                        {deadline.title}
                      </h4>
                      {deadline.isConferenceDate && (
                        <Badge variant="accent">Countdown Target</Badge>
                      )}
                      {deadline.isExtended && (
                        <Badge variant="draft">Extended</Badge>
                      )}
                      {!deadline.isVisible && (
                        <Badge variant="secondary">Hidden</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">
                      Display: <span className="font-medium">{deadline.displayDate}</span>
                      {deadline.originalDate && (
                        <span className="ml-2 text-xs text-slate-400 line-through">
                          {deadline.originalDate}
                        </span>
                      )}
                    </p>
                    <p className="text-xs font-mono text-slate-500">
                      {formatIstDateTime(deadline.dueAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <PublishControls
                      table="deadlines"
                      recordId={deadline.id}
                      editionYear={editionYear}
                      currentStatus={deadline.status}
                      actorRole={actorRole}
                      isFallbackRecord={isFallbackRecord || isFallback}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(deadline)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {canDelete && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(deadline.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    )}
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
