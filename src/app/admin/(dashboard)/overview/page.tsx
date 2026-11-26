import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Clock,
  History,
  Link2,
  MapPin,
  Settings,
} from "lucide-react";
import { requireAdminPageSession } from "@/lib/auth/session";
import {
  loadAdminEditionData,
  resolveEditionYearParam,
} from "@/lib/cms/admin-data";
import { formatIstDateTime, getCountdownParts } from "@/lib/dates/ist";
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

export const metadata: Metadata = {
  title: "Overview",
};

interface OverviewPageProps {
  searchParams: Promise<{ edition?: string | string[] }>;
}

export default async function AdminOverviewPage({
  searchParams,
}: OverviewPageProps) {
  const params = await searchParams;
  const year = resolveEditionYearParam(params.edition);

  const [actor, data] = await Promise.all([
    requireAdminPageSession(),
    loadAdminEditionData(year),
  ]);

  const countdown = getCountdownParts(data.edition.startDate, Date.now());
  const editionQuery = `?edition=${data.selectedYear}`;

  const statCards = [
    {
      label: "Deadlines",
      value: data.counts.deadlines,
      detail: `${data.counts.publishedDeadlines} published`,
      href: `/admin/deadlines${editionQuery}`,
    },
    {
      label: "External Links",
      value: data.counts.conferenceLinks,
      detail: "CMT, Registration, Overleaf",
      href: `/admin/resources${editionQuery}`,
    },
    {
      label: "Resources & Templates",
      value: data.counts.resources,
      detail: "Downloads & agreements",
      href: `/admin/resources${editionQuery}`,
    },
    {
      label: "Tracks & Sessions",
      value: `${data.counts.tracks} / ${data.counts.programSessions}`,
      detail: "Tracks / Program schedule",
      href: `/admin/event-settings${editionQuery}`,
    },
    {
      label: "Speakers & Committees",
      value: `${data.counts.speakers} / ${data.counts.committees}`,
      detail: "Keynotes / Committees",
      href: `/admin/event-settings${editionQuery}`,
    },
    {
      label: "Sponsors & Fee Tiers",
      value: `${data.counts.sponsors} / ${data.counts.registrationFees}`,
      detail: "Partners / Registration",
      href: `/admin/event-settings${editionQuery}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {data.edition.subtitle} Overview
            </h1>
            {data.edition.isActive && (
              <Badge variant="published">Active Public Edition</Badge>
            )}
            <Badge variant={data.edition.status} className="capitalize">
              {data.edition.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">{data.edition.title}</p>
        </div>

        <PublishControls
          table="conference_editions"
          recordId={data.edition.id}
          editionYear={data.selectedYear}
          currentStatus={data.edition.status}
          actorRole={actor.role}
          canApproveFinancial={actor.canApproveFinancial}
          isFallbackRecord={data.source === "fallback"}
        />
      </div>

      {/* Conference schedule + IST countdown summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              Conference Schedule ({data.edition.timezone})
            </CardTitle>
            <CardDescription>
              All timestamps stored and rendered explicitly in Asia/Kolkata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Starts</span>
              <span className="font-medium text-slate-900">
                {formatIstDateTime(data.edition.startDate)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Ends</span>
              <span className="font-medium text-slate-900">
                {formatIstDateTime(data.edition.endDate)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Countdown</span>
              {countdown.isLive ? (
                <Badge variant="published">Event Started / Completed</Badge>
              ) : (
                <span className="font-mono text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-md px-2.5 py-1">
                  {countdown.days}d {countdown.hours}h {countdown.minutes}m{" "}
                  {countdown.seconds}s remaining
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-600" />
              Venue, Format & SEO Canonical
            </CardTitle>
            <CardDescription>
              Edition identity and canonical publication metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Venue</span>
              <span className="font-medium text-slate-900 text-right">
                {data.edition.venueName}
                {data.edition.venueCity ? `, ${data.edition.venueCity}` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Format</span>
              <Badge variant="secondary" className="uppercase text-[11px]">
                {data.edition.format}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Canonical URL</span>
              <span className="font-mono text-xs text-slate-700 truncate max-w-[260px]">
                {data.siteSettings.canonicalUrl}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CMS inventory cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Card key={card.label} className="flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl font-bold">{card.value}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">{card.detail}</span>
              <Button variant="ghost" size="sm" asChild>
                <Link href={card.href}>
                  Manage <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>Core Administration Actions</CardTitle>
          <CardDescription>
            Update edition dates, IST deadlines, and verified external portals.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="primary" asChild>
            <Link href={`/admin/event-settings${editionQuery}`}>
              <Settings className="h-4 w-4" />
              Edit Event Settings & SEO
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/deadlines${editionQuery}`}>
              <CalendarClock className="h-4 w-4" />
              Manage Important Dates
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/admin/resources${editionQuery}`}>
              <Link2 className="h-4 w-4" />
              Manage External Links & Resources
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent audit log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            Recent CMS Audit Activity
          </CardTitle>
          <CardDescription>
            Immutable audit trail of recent creates, edits, publishes, and
            archives.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentAuditLogs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No database audit entries recorded yet for this environment.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="uppercase text-[10px]">
                      {log.action}
                    </Badge>
                    <span className="font-mono text-xs text-slate-700">
                      {log.table_name}
                    </span>
                    <span className="text-xs text-slate-500">
                      by {log.actor_role ?? "admin"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatIstDateTime(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
