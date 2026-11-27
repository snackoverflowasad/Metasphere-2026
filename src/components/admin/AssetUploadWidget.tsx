"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { uploadConferenceAssetAction } from "@/features/resources/upload-action";
import { Button } from "@/components/ui/button";

export interface AssetUploadWidgetProps {
  editionYear: number;
  bucket?: "conference-public" | "conference-private";
  disabled?: boolean;
  label?: string;
  onUploaded: (result: { url: string; path: string }) => void;
}

/**
 * Optional Supabase Storage uploader for new conference assets (PNG, JPEG,
 * WEBP, PDF up to 10 MB; SVG/HTML blocked). Leaves existing Cloudinary URLs
 * independently editable.
 */
export function AssetUploadWidget({
  editionYear,
  bucket = "conference-public",
  disabled = false,
  label = "Upload Asset (PNG, JPG, WEBP, PDF)",
  onUploaded,
}: AssetUploadWidgetProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", bucket);
    formData.append("editionYear", String(editionYear));

    startTransition(async () => {
      const result = await uploadConferenceAssetAction(formData);
      if (!result.ok) {
        setStatus({ type: "error", message: result.error });
        return;
      }
      onUploaded(result.data);
      setStatus({
        type: "success",
        message: `Uploaded to ${result.data.path}`,
      });
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    });
  };

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-3 space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
          onChange={handleFileChange}
          disabled={disabled || isPending}
          className="hidden"
          aria-label={label}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          {isPending ? "Uploading..." : "Choose File"}
        </Button>
      </div>
      {status && (
        <p
          role={status.type === "error" ? "alert" : "status"}
          className={
            status.type === "error"
              ? "text-xs text-red-600"
              : "text-xs text-emerald-700"
          }
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
