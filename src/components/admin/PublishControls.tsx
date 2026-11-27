"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, CheckCircle2, FileEdit } from "lucide-react";
import type { AdminRole, PublicationStatus } from "@/types/database";
import type { PublishableTable } from "@/lib/cms/mutations";
import { canPerform } from "@/lib/permissions/rbac";
import { publishContentAction } from "@/features/conference/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface PublishControlsProps {
  table: PublishableTable;
  recordId: string;
  editionYear: number;
  currentStatus: PublicationStatus;
  actorRole: AdminRole;
  canApproveFinancial?: boolean;
  isFallbackRecord?: boolean;
}

export function PublishControls({
  table,
  recordId,
  editionYear,
  currentStatus,
  actorRole,
  canApproveFinancial = false,
  isFallbackRecord = false,
}: PublishControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const canPublish =
    table === "registration_fees"
      ? canPerform(actorRole, "publish_financial", { canApproveFinancial })
      : canPerform(actorRole, "publish_content");

  const canArchive =
    table === "registration_fees"
      ? canPerform(actorRole, "publish_financial", { canApproveFinancial })
      : canPerform(actorRole, "archive_content");

  const handleStatusChange = (nextStatus: PublicationStatus) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await publishContentAction(
        table,
        recordId,
        editionYear,
        nextStatus
      );
      if (!result.ok) {
        setFeedback({ type: "error", message: result.error });
        return;
      }
      setFeedback({
        type: "success",
        message: `Status updated to ${nextStatus}.`,
      });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={currentStatus} className="capitalize">
          {currentStatus}
        </Badge>

        {canPublish && currentStatus !== "published" && (
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={isPending || isFallbackRecord}
            onClick={() => handleStatusChange("published")}
            title={
              isFallbackRecord
                ? "Seed database first to publish persisted records"
                : "Publish to public site"
            }
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Publish
          </Button>
        )}

        {canPublish && currentStatus !== "draft" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending || isFallbackRecord}
            onClick={() => handleStatusChange("draft")}
          >
            <FileEdit className="h-3.5 w-3.5" />
            Move to Draft
          </Button>
        )}

        {canArchive && currentStatus !== "archived" && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={isPending || isFallbackRecord}
            onClick={() => handleStatusChange("archived")}
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </Button>
        )}
      </div>

      {!canPublish && (
        <span className="text-[11px] text-slate-500">
          Editors save drafts; Content Admins publish.
        </span>
      )}

      {feedback && (
        <p
          role={feedback.type === "error" ? "alert" : "status"}
          className={
            feedback.type === "error"
              ? "text-xs text-red-600"
              : "text-xs text-emerald-700"
          }
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
