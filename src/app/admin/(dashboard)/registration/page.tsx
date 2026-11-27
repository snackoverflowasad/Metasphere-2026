import type { Metadata } from "next";
import { requireAdminPageSession } from "@/lib/auth/session";
import { resolveEditionYearParam } from "@/lib/cms/admin-data";
import { loadAdminRegistrationData } from "@/lib/cms/admin-modules";
import { RegistrationManager } from "./RegistrationManager";

export const metadata: Metadata = {
  title: "Registration & Fees",
};

interface RegistrationPageProps {
  searchParams: Promise<{ edition?: string | string[] }>;
}

export default async function AdminRegistrationPage({
  searchParams,
}: RegistrationPageProps) {
  const params = await searchParams;
  const year = resolveEditionYearParam(params.edition);

  const [actor, data] = await Promise.all([
    requireAdminPageSession(),
    loadAdminRegistrationData(year),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {data.context.editionSubtitle} — Registration & Fees
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage INR/USD registration fee slabs and bank/UPI payment details.
        </p>
      </div>

      <RegistrationManager
        editionId={data.context.editionId}
        editionYear={data.context.editionYear}
        fees={data.fees}
        paymentInstructions={data.paymentInstructions}
        actorRole={actor.role}
        canApproveFinancial={actor.canApproveFinancial}
        isFallbackRecord={data.context.source === "fallback"}
      />
    </div>
  );
}
