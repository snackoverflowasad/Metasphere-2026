import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { requireAdminPageSession } from "@/lib/auth/session";
import { loadAdminAuditActivity } from "@/lib/cms/admin-modules";
import { formatIstDateTime } from "@/lib/dates/ist";
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
  title: "Audit Activity",
};

interface ActivityPageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

export default async function AdminActivityPage({
  searchParams,
}: ActivityPageProps) {
  const params = await searchParams;
  const [, activity] = await Promise.all([
    requireAdminPageSession(),
    loadAdminAuditActivity(params.page, 25),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(activity.totalCount / activity.pageSize)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Immutable Audit Activity
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Chronological record of CMS edits, publishes, file uploads, and role updates
          (25 entries per page, IST).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-orange-600" />
            Audit Log Entries
          </CardTitle>
          <CardDescription>
            Page {activity.page} of {totalPages} • {activity.totalCount} total events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activity.logs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No audit log entries recorded yet in this environment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="py-2 pr-4">Timestamp (IST)</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Table</th>
                    <th className="py-2 pr-4">Record ID</th>
                    <th className="py-2 pr-4">Actor Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activity.logs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-xs text-slate-700">
                        {formatIstDateTime(log.created_at)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="secondary" className="uppercase text-[10px]">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-700">
                        {log.table_name}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">
                        {log.record_id ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-600">
                        {log.actor_role ?? "admin"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={activity.page <= 1}
            >
              <Link
                href={`/admin/activity?page=${Math.max(1, activity.page - 1)}`}
                aria-disabled={activity.page <= 1}
              >
                Previous
              </Link>
            </Button>
            <span className="text-xs text-slate-500">
              Page {activity.page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={activity.page >= totalPages}
            >
              <Link
                href={`/admin/activity?page=${Math.min(
                  totalPages,
                  activity.page + 1
                )}`}
                aria-disabled={activity.page >= totalPages}
              >
                Next
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
