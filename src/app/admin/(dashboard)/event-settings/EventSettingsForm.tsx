"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { z } from "zod";
import type {
  AdminRole,
  EditionSummary,
  SiteSettingsSnapshot,
} from "@/types/database";
import {
  IST_TIMEZONE,
  fromIstDateTimeLocalValue,
  toIstDateTimeLocalValue,
} from "@/lib/dates/ist";
import { safeHttpUrlSchema } from "@/lib/validation/common";
import { updateEditionSettingsAction } from "@/features/conference/actions";
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

const eventSettingsFormSchema = z.object({
  title: z.string().trim().min(3, "Conference title is required").max(300),
  subtitle: z.string().trim().max(150),
  tagline: z.string().trim().max(300),
  loaderSubtitle: z.string().trim().max(200),
  datesDisplay: z.string().trim().min(2, "Display dates text is required").max(120),
  startDateLocal: z.string().trim().min(1, "Start date & time (IST) is required"),
  endDateLocal: z.string().trim().min(1, "End date & time (IST) is required"),
  venueName: z.string().trim().min(2, "Venue name is required").max(200),
  venueAddress: z.string().trim().max(400),
  venueCity: z.string().trim().max(120),
  format: z.enum(["online", "offline", "hybrid"]),
  description: z.string().trim().max(4000),
  technicalCoSponsorsSummary: z.string().trim().max(1000),
  cmtAcknowledgment: z.string().trim().max(2000),
  publicationNote: z.string().trim().max(2000),
  contactEmailsText: z.string().trim().min(3, "At least one email is required"),
  contactPhonesText: z.string().trim(),
  canonicalUrl: safeHttpUrlSchema,
  seoTitle: z.string().trim().min(3, "SEO title is required").max(200),
  seoDescription: z.string().trim().min(10, "SEO description must be at least 10 chars").max(500),
  isActive: z.boolean(),
});

type EventSettingsFormValues = z.infer<typeof eventSettingsFormSchema>;

export interface EventSettingsFormProps {
  edition: EditionSummary;
  siteSettings: SiteSettingsSnapshot;
  actorRole: AdminRole;
  isFallbackRecord: boolean;
}

export function EventSettingsForm({
  edition,
  siteSettings,
  actorRole,
  isFallbackRecord,
}: EventSettingsFormProps) {
  const router = useRouter();
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventSettingsFormValues>({
    resolver: zodResolver(eventSettingsFormSchema),
    defaultValues: {
      title: edition.title,
      subtitle: edition.subtitle,
      tagline: edition.tagline,
      loaderSubtitle: edition.loaderSubtitle,
      datesDisplay: edition.datesDisplay,
      startDateLocal: toIstDateTimeLocalValue(edition.startDate),
      endDateLocal: toIstDateTimeLocalValue(edition.endDate),
      venueName: edition.venueName,
      venueAddress: edition.venueAddress,
      venueCity: edition.venueCity,
      format: edition.format,
      description: edition.description,
      technicalCoSponsorsSummary: edition.technicalCoSponsorsSummary,
      cmtAcknowledgment: edition.cmtAcknowledgment,
      publicationNote: edition.publicationNote,
      contactEmailsText: edition.contactEmails.join(", "),
      contactPhonesText: edition.contactPhones.join(", "),
      canonicalUrl: siteSettings.canonicalUrl,
      seoTitle: siteSettings.seoTitle,
      seoDescription: siteSettings.seoDescription,
      isActive: edition.isActive,
    },
  });

  const onSubmit = async (values: EventSettingsFormValues) => {
    setStatusBanner(null);

    const contactEmails = values.contactEmailsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const contactPhones = values.contactPhonesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const result = await updateEditionSettingsAction(edition.id, {
      editionYear: edition.year,
      title: values.title,
      subtitle: values.subtitle,
      tagline: values.tagline,
      loaderSubtitle: values.loaderSubtitle,
      datesDisplay: values.datesDisplay,
      startDate: fromIstDateTimeLocalValue(values.startDateLocal),
      endDate: fromIstDateTimeLocalValue(values.endDateLocal),
      timezone: IST_TIMEZONE,
      venueName: values.venueName,
      venueAddress: values.venueAddress,
      venueCity: values.venueCity,
      format: values.format,
      description: values.description,
      technicalCoSponsorsSummary: values.technicalCoSponsorsSummary || null,
      cmtAcknowledgment: values.cmtAcknowledgment || null,
      publicationNote: values.publicationNote || null,
      contactEmails,
      contactPhones,
      canonicalUrl: values.canonicalUrl,
      seoTitle: values.seoTitle,
      seoDescription: values.seoDescription,
      isActive: values.isActive,
    });

    if (!result.ok) {
      setStatusBanner({ type: "error", message: result.error });
      return;
    }

    setStatusBanner({
      type: "success",
      message: "Edition settings and SEO metadata saved successfully.",
    });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Event Settings & SEO — {edition.year}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure conference metadata, IST (UTC+5:30) dates, venue, contact
            channels, and canonical SEO tags.
          </p>
        </div>

        <PublishControls
          table="conference_editions"
          recordId={edition.id}
          editionYear={edition.year}
          currentStatus={edition.status}
          actorRole={actorRole}
          isFallbackRecord={isFallbackRecord}
        />
      </div>

      {isFallbackRecord && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Showing read-only seed fallback data. Seed{" "}
          <code className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">
            supabase/seed.sql
          </code>{" "}
          in Supabase before saving or publishing edition settings.
        </div>
      )}

      {statusBanner && (
        <div
          role={statusBanner.type === "error" ? "alert" : "status"}
          className={
            statusBanner.type === "error"
              ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          }
        >
          {statusBanner.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Conference Identity & Dates (IST UTC+5:30)</CardTitle>
            <CardDescription>
              Timezone is locked to <code className="font-mono">Asia/Kolkata</code>{" "}
              for consistent countdowns and schedules.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="title">Full Conference Title</Label>
              <Input id="title" {...register("title")} />
              {errors.title && (
                <p className="text-xs text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subtitle">Short Subtitle</Label>
              <Input id="subtitle" {...register("subtitle")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="datesDisplay">Public Dates Display Label</Label>
              <Input
                id="datesDisplay"
                placeholder="17th & 18th August, 2027"
                {...register("datesDisplay")}
              />
              {errors.datesDisplay && (
                <p className="text-xs text-red-600">
                  {errors.datesDisplay.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" {...register("tagline")} />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="loaderSubtitle">Loader Subtitle</Label>
              <Input id="loaderSubtitle" {...register("loaderSubtitle")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="startDateLocal">
                Start Date & Time (IST UTC+5:30)
              </Label>
              <Input
                id="startDateLocal"
                type="datetime-local"
                {...register("startDateLocal")}
              />
              {errors.startDateLocal && (
                <p className="text-xs text-red-600">
                  {errors.startDateLocal.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endDateLocal">
                End Date & Time (IST UTC+5:30)
              </Label>
              <Input
                id="endDateLocal"
                type="datetime-local"
                {...register("endDateLocal")}
              />
              {errors.endDateLocal && (
                <p className="text-xs text-red-600">
                  {errors.endDateLocal.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <div className="flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                <span className="font-mono text-xs">{IST_TIMEZONE}</span>
                <Badge variant="secondary">IST (UTC+5:30)</Badge>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="format">Conference Format</Label>
              <Controller
                control={control}
                name="format"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="offline">Offline (In-Person)</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="description">Conference Overview Description</Label>
              <Textarea id="description" rows={4} {...register("description")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Venue, Contacts & Acknowledgments</CardTitle>
            <CardDescription>
              Location details, organizer contacts, and Springer / Microsoft CMT
              statements.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="venueName">Venue Name</Label>
              <Input id="venueName" {...register("venueName")} />
              {errors.venueName && (
                <p className="text-xs text-red-600">
                  {errors.venueName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="venueCity">Venue City</Label>
              <Input id="venueCity" {...register("venueCity")} />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="venueAddress">Venue Street Address</Label>
              <Input id="venueAddress" {...register("venueAddress")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactEmailsText">
                Contact Emails (comma-separated)
              </Label>
              <Input
                id="contactEmailsText"
                {...register("contactEmailsText")}
              />
              {errors.contactEmailsText && (
                <p className="text-xs text-red-600">
                  {errors.contactEmailsText.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactPhonesText">
                Contact Phones (comma-separated)
              </Label>
              <Input
                id="contactPhonesText"
                {...register("contactPhonesText")}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="technicalCoSponsorsSummary">
                Technical Co-Sponsors Summary
              </Label>
              <Input
                id="technicalCoSponsorsSummary"
                {...register("technicalCoSponsorsSummary")}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="cmtAcknowledgment">
                Microsoft CMT Acknowledgment
              </Label>
              <Textarea
                id="cmtAcknowledgment"
                rows={3}
                {...register("cmtAcknowledgment")}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="publicationNote">Publication Note</Label>
              <Textarea
                id="publicationNote"
                rows={2}
                {...register("publicationNote")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO & Canonical Configuration</CardTitle>
            <CardDescription>
              Only <code className="font-mono">http://</code> and{" "}
              <code className="font-mono">https://</code> canonical URLs are
              permitted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="canonicalUrl">Canonical URL</Label>
              <Input
                id="canonicalUrl"
                type="url"
                placeholder="https://metasphere2027.iem.edu.in"
                {...register("canonicalUrl")}
              />
              {errors.canonicalUrl && (
                <p className="text-xs text-red-600">
                  {errors.canonicalUrl.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="seoTitle">SEO Title</Label>
              <Input id="seoTitle" {...register("seoTitle")} />
              {errors.seoTitle && (
                <p className="text-xs text-red-600">
                  {errors.seoTitle.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="seoDescription">SEO Meta Description</Label>
              <Textarea
                id="seoDescription"
                rows={3}
                {...register("seoDescription")}
              />
              {errors.seoDescription && (
                <p className="text-xs text-red-600">
                  {errors.seoDescription.message}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2.5 text-sm text-slate-700 pt-1 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                {...register("isActive")}
              />
              <span>
                Set {edition.year} as the active default public edition (Content
                Admin / Super Admin only)
              </span>
            </label>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isFallbackRecord}
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? "Saving changes..." : "Save Event Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
