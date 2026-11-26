"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, FileText, Link2, Pencil, Plus } from "lucide-react";
import { z } from "zod";
import type {
  AdminRole,
  ConferenceLinkSnapshot,
  PublicationStatus,
  ResourceSnapshot,
} from "@/types/database";
import { canPerform } from "@/lib/permissions/rbac";
import {
  publicationStatusSchema,
  safeHttpUrlSchema,
} from "@/lib/validation/common";
import {
  upsertConferenceLinkAction,
  upsertResourceAction,
} from "@/features/resources/actions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const linkFormSchema = z.object({
  id: z.string().optional(),
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "Lowercase letters, digits, and underscores only")
    .min(2)
    .max(64),
  label: z.string().trim().min(2, "Label is required").max(200),
  url: safeHttpUrlSchema,
  status: publicationStatusSchema,
});

type LinkFormValues = z.infer<typeof linkFormSchema>;

const resourceFormSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().trim().min(2, "Label is required").max(200),
    category: z.string().trim().min(2, "Category is required").max(80),
    url: z.union([safeHttpUrlSchema, z.literal("")]),
    storagePath: z.string().trim().max(300),
    sortOrder: z.number().int().min(0).max(999),
    status: publicationStatusSchema,
  })
  .refine(
    (data) => Boolean(data.url.trim() || data.storagePath.trim()),
    {
      message: "Provide either a valid http(s) URL or a storage asset path.",
      path: ["url"],
    }
  );

type ResourceFormValues = z.infer<typeof resourceFormSchema>;

export interface ResourcesManagerProps {
  editionId: string;
  editionYear: number;
  conferenceLinks: ConferenceLinkSnapshot[];
  resources: ResourceSnapshot[];
  actorRole: AdminRole;
  isFallbackRecord: boolean;
}

export function ResourcesManager({
  editionId,
  editionYear,
  conferenceLinks,
  resources,
  actorRole,
  isFallbackRecord,
}: ResourcesManagerProps) {
  const router = useRouter();
  const canPublish = canPerform(actorRole, "publish_content");
  const [editingLinkKey, setEditingLinkKey] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(
    null
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const linkDefaults: LinkFormValues = {
    id: undefined,
    key: "",
    label: "",
    url: "",
    status: "draft",
  };

  const resourceDefaults: ResourceFormValues = {
    id: undefined,
    label: "",
    category: "template",
    url: "",
    storagePath: "",
    sortOrder: resources.length + 1,
    status: "draft",
  };

  const linkForm = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: linkDefaults,
  });

  const resourceForm = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: resourceDefaults,
  });

  const handleEditLink = (link: ConferenceLinkSnapshot) => {
    setFeedback(null);
    setEditingLinkKey(link.key);
    linkForm.reset({
      id: link.id.startsWith("fallback-") ? undefined : link.id,
      key: link.key,
      label: link.label,
      url: link.url,
      status: canPublish ? link.status : "draft",
    });
  };

  const handleEditResource = (resource: ResourceSnapshot) => {
    setFeedback(null);
    setEditingResourceId(resource.id);
    resourceForm.reset({
      id: resource.id.startsWith("fallback-") ? undefined : resource.id,
      label: resource.label,
      category: resource.category,
      url: resource.url ?? "",
      storagePath: resource.storagePath ?? "",
      sortOrder: resource.sortOrder,
      status: canPublish ? resource.status : "draft",
    });
  };

  const submitLink = async (values: LinkFormValues) => {
    setFeedback(null);
    const targetStatus: PublicationStatus = canPublish
      ? values.status
      : "draft";

    const result = await upsertConferenceLinkAction({
      id: values.id,
      editionId,
      editionYear,
      key: values.key,
      label: values.label,
      url: values.url,
      status: targetStatus,
    });

    if (!result.ok) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    setFeedback({
      type: "success",
      message: `External link "${values.key}" saved.`,
    });
    setEditingLinkKey(null);
    linkForm.reset(linkDefaults);
    router.refresh();
  };

  const submitResource = async (values: ResourceFormValues) => {
    setFeedback(null);
    const targetStatus: PublicationStatus = canPublish
      ? values.status
      : "draft";

    const result = await upsertResourceAction({
      id: values.id,
      editionId,
      editionYear,
      label: values.label,
      category: values.category,
      url: values.url || null,
      storagePath: values.storagePath || null,
      sortOrder: values.sortOrder,
      status: targetStatus,
    });

    if (!result.ok) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    setFeedback({
      type: "success",
      message: `Resource "${values.label}" saved.`,
    });
    setEditingResourceId(null);
    resourceForm.reset(resourceDefaults);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          External Links & Resources — {editionYear}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage Microsoft CMT, registration forms, Overleaf templates, Google
          Drive links, and downloadable conference documents. All external URLs
          strictly enforce <code className="font-mono">http://</code> or{" "}
          <code className="font-mono">https://</code>.
        </p>
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
          in Supabase before saving or publishing links and resources.
        </div>
      )}

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

      <Tabs defaultValue="links">
        <TabsList>
          <TabsTrigger value="links">
            External Portals ({conferenceLinks.length})
          </TabsTrigger>
          <TabsTrigger value="resources">
            Downloadable Resources ({resources.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-orange-600" />
                {editingLinkKey
                  ? `Edit Link (${editingLinkKey})`
                  : "Add / Update Conference Link"}
              </CardTitle>
              <CardDescription>
                Keyed links power public CTAs such as{" "}
                <code className="font-mono">cmt_submission</code>,{" "}
                <code className="font-mono">registration_form</code>, and{" "}
                <code className="font-mono">latex_template</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={linkForm.handleSubmit(submitLink)}
                className="grid gap-4 sm:grid-cols-2"
                noValidate
              >
                <div className="space-y-1.5">
                  <Label htmlFor="link-key">Link Key</Label>
                  <Input
                    id="link-key"
                    placeholder="cmt_submission"
                    {...linkForm.register("key")}
                  />
                  {linkForm.formState.errors.key && (
                    <p className="text-xs text-red-600">
                      {linkForm.formState.errors.key.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="link-label">Display Label</Label>
                  <Input
                    id="link-label"
                    placeholder="Microsoft CMT Submission Portal"
                    {...linkForm.register("label")}
                  />
                  {linkForm.formState.errors.label && (
                    <p className="text-xs text-red-600">
                      {linkForm.formState.errors.label.message}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="link-url">URL (http:// or https://)</Label>
                  <Input
                    id="link-url"
                    type="url"
                    placeholder="https://cmt3.research.microsoft.com/..."
                    {...linkForm.register("url")}
                  />
                  {linkForm.formState.errors.url && (
                    <p className="text-xs text-red-600">
                      {linkForm.formState.errors.url.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="link-status">Status</Label>
                  <Controller
                    control={linkForm.control}
                    name="status"
                    render={({ field }) => (
                      <Select
                        value={canPublish ? field.value : "draft"}
                        onValueChange={field.onChange}
                        disabled={!canPublish}
                      >
                        <SelectTrigger id="link-status">
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

                <div className="flex items-end justify-end gap-2">
                  {editingLinkKey && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingLinkKey(null);
                        linkForm.reset(linkDefaults);
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={linkForm.formState.isSubmitting || isFallbackRecord}
                  >
                    {linkForm.formState.isSubmitting
                      ? "Saving..."
                      : "Save External Link"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-orange-600" />
                Configured External Links
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {conferenceLinks.map((link) => {
                const isFallback = link.id.startsWith("fallback-");
                return (
                  <div
                    key={link.id}
                    className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {link.key}
                        </Badge>
                        <span className="font-semibold text-slate-900">
                          {link.label}
                        </span>
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-mono text-orange-700 hover:underline break-all"
                      >
                        {link.url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <PublishControls
                        table="conference_links"
                        recordId={link.id}
                        editionYear={editionYear}
                        currentStatus={link.status}
                        actorRole={actorRole}
                        isFallbackRecord={isFallbackRecord || isFallback}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditLink(link)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-orange-600" />
                {editingResourceId ? "Edit Resource" : "Add / Update Resource"}
              </CardTitle>
              <CardDescription>
                Templates, agreement forms, brochures, and presentation files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={resourceForm.handleSubmit(submitResource)}
                className="grid gap-4 sm:grid-cols-2"
                noValidate
              >
                <div className="space-y-1.5">
                  <Label htmlFor="res-label">Resource Label</Label>
                  <Input
                    id="res-label"
                    placeholder="Template in Microsoft Word (US Letter)"
                    {...resourceForm.register("label")}
                  />
                  {resourceForm.formState.errors.label && (
                    <p className="text-xs text-red-600">
                      {resourceForm.formState.errors.label.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="res-category">Category</Label>
                  <Input
                    id="res-category"
                    placeholder="template | brochure | agreement_form"
                    {...resourceForm.register("category")}
                  />
                  {resourceForm.formState.errors.category && (
                    <p className="text-xs text-red-600">
                      {resourceForm.formState.errors.category.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="res-url">External URL (optional)</Label>
                  <Input
                    id="res-url"
                    type="url"
                    placeholder="https://drive.google.com/..."
                    {...resourceForm.register("url")}
                  />
                  {resourceForm.formState.errors.url && (
                    <p className="text-xs text-red-600">
                      {resourceForm.formState.errors.url.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="res-storage">
                    Storage / Asset Path (optional)
                  </Label>
                  <Input
                    id="res-storage"
                    placeholder="Assets/WordTemplate.zip"
                    {...resourceForm.register("storagePath")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="res-sort">Sort Order</Label>
                  <Input
                    id="res-sort"
                    type="number"
                    min={0}
                    {...resourceForm.register("sortOrder", {
                      valueAsNumber: true,
                    })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="res-status">Status</Label>
                  <Controller
                    control={resourceForm.control}
                    name="status"
                    render={({ field }) => (
                      <Select
                        value={canPublish ? field.value : "draft"}
                        onValueChange={field.onChange}
                        disabled={!canPublish}
                      >
                        <SelectTrigger id="res-status">
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

                <div className="sm:col-span-2 flex items-center justify-end gap-2">
                  {editingResourceId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingResourceId(null);
                        resourceForm.reset(resourceDefaults);
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={
                      resourceForm.formState.isSubmitting || isFallbackRecord
                    }
                  >
                    {resourceForm.formState.isSubmitting
                      ? "Saving..."
                      : "Save Resource"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                Downloadable Resources ({resources.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100">
              {resources.map((resource) => {
                const isFallback = resource.id.startsWith("fallback-");
                return (
                  <div
                    key={resource.id}
                    className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">
                          #{resource.sortOrder}
                        </span>
                        <Badge variant="secondary">{resource.category}</Badge>
                        <span className="font-semibold text-slate-900">
                          {resource.label}
                        </span>
                      </div>
                      {resource.url && (
                        <p className="text-xs font-mono text-orange-700 break-all">
                          URL: {resource.url}
                        </p>
                      )}
                      {resource.storagePath && (
                        <p className="text-xs font-mono text-slate-500 break-all">
                          Asset: {resource.storagePath}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <PublishControls
                        table="resources"
                        recordId={resource.id}
                        editionYear={editionYear}
                        currentStatus={resource.status}
                        actorRole={actorRole}
                        isFallbackRecord={isFallbackRecord || isFallback}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditResource(resource)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
