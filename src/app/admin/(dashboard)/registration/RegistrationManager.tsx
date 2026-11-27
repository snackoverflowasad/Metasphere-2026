"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, CreditCard, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import type {
  AdminRole,
  PaymentInstructions,
  PublicationStatus,
  RegistrationFeeSnapshot,
} from "@/types/database";
import { canPublishFinancialRecord } from "@/lib/permissions/rbac";
import {
  deleteRegistrationFeeAction,
  publishRegistrationFeeAction,
  updatePaymentInstructionsAction,
  upsertRegistrationFeeAction,
} from "@/features/registration/actions";
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
import { Textarea } from "@/components/ui/textarea";

export interface RegistrationManagerProps {
  editionId: string;
  editionYear: number;
  fees: RegistrationFeeSnapshot[];
  paymentInstructions: PaymentInstructions;
  actorRole: AdminRole;
  canApproveFinancial: boolean;
  isFallbackRecord: boolean;
}

export function RegistrationManager({
  editionId,
  editionYear,
  fees,
  paymentInstructions,
  actorRole,
  canApproveFinancial,
  isFallbackRecord,
}: RegistrationManagerProps) {
  const router = useRouter();
  const canApprove = canPublishFinancialRecord({
    role: actorRole,
    canApproveFinancial,
  });

  const [feeForm, setFeeForm] = useState<{
    id: string | null;
    category: string;
    amountInr: number;
    amountUsd: number;
    indianDisplay: string;
    foreignDisplay: string;
    taxNote: string;
    sortOrder: number;
    status: PublicationStatus;
  }>({
    id: null,
    category: "",
    amountInr: 0,
    amountUsd: 0,
    indianDisplay: "",
    foreignDisplay: "",
    taxNote: "Rates are Inclusive of 18% GST",
    sortOrder: fees.length + 1,
    status: "draft",
  });

  const [bankForm, setBankForm] = useState<PaymentInstructions>(paymentInstructions);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await upsertRegistrationFeeAction(feeForm.id, {
        editionId,
        editionYear,
        category: feeForm.category,
        amountInr: Math.max(0, Math.trunc(Number(feeForm.amountInr) || 0)),
        amountUsd: Math.max(0, Math.trunc(Number(feeForm.amountUsd) || 0)),
        indianDisplay: feeForm.indianDisplay || `₹${feeForm.amountInr}`,
        foreignDisplay: feeForm.foreignDisplay || `$${feeForm.amountUsd}`,
        taxNote: feeForm.taxNote,
        sortOrder: Number(feeForm.sortOrder) || 0,
        status: canApprove ? feeForm.status : "draft",
      });
      if (!res.ok) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      setFeedback({ type: "success", message: "Registration fee draft saved." });
      setFeeForm({
        id: null,
        category: "",
        amountInr: 0,
        amountUsd: 0,
        indianDisplay: "",
        foreignDisplay: "",
        taxNote: "Rates are Inclusive of 18% GST",
        sortOrder: fees.length + 2,
        status: "draft",
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishFee = async (feeId: string) => {
    setFeedback(null);
    const res = await publishRegistrationFeeAction(feeId, editionYear);
    if (!res.ok) {
      setFeedback({ type: "error", message: res.error });
      return;
    }
    setFeedback({ type: "success", message: "Registration fee approved and published." });
    router.refresh();
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await updatePaymentInstructionsAction(
        editionId,
        editionYear,
        bankForm
      );
      if (!res.ok) {
        setFeedback({ type: "error", message: res.error });
        return;
      }
      setFeedback({ type: "success", message: "Bank/UPI instructions updated." });
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

      {!canApprove && (
        <div
          role="status"
          className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 flex items-center gap-2"
        >
          <Lock className="h-4 w-4 text-slate-500 shrink-0" />
          <span>
            You can create and edit fee drafts, but publishing fees or changing bank/UPI
            details requires <strong>Financial Approval</strong> permission or a{" "}
            <span className="font-mono">super_admin</span> role.
          </span>
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
            <CreditCard className="h-4 w-4 text-orange-600" />
            {feeForm.id ? "Edit Registration Fee Tier" : "Add Registration Fee Tier"}
          </CardTitle>
          <CardDescription>
            Amounts are whole integers in INR (₹) and USD ($). All edits start as Draft unless approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveFee} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="rf-cat">Category</Label>
                <Input
                  id="rf-cat"
                  required
                  value={feeForm.category}
                  onChange={(e) => setFeeForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Indian Author (IEEE Member)"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rf-sort">Sort Order</Label>
                <Input
                  id="rf-sort"
                  type="number"
                  min={0}
                  value={feeForm.sortOrder}
                  onChange={(e) =>
                    setFeeForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="rf-inr">Amount INR (₹)</Label>
                <Input
                  id="rf-inr"
                  type="number"
                  min={0}
                  required
                  value={feeForm.amountInr}
                  onChange={(e) =>
                    setFeeForm((f) => ({ ...f, amountInr: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rf-usd">Amount USD ($)</Label>
                <Input
                  id="rf-usd"
                  type="number"
                  min={0}
                  required
                  value={feeForm.amountUsd}
                  onChange={(e) =>
                    setFeeForm((f) => ({ ...f, amountUsd: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rf-ind-disp">Indian Display Label</Label>
                <Input
                  id="rf-ind-disp"
                  value={feeForm.indianDisplay}
                  onChange={(e) =>
                    setFeeForm((f) => ({ ...f, indianDisplay: e.target.value }))
                  }
                  placeholder="INR 6,000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rf-for-disp">Foreign Display Label</Label>
                <Input
                  id="rf-for-disp"
                  value={feeForm.foreignDisplay}
                  onChange={(e) =>
                    setFeeForm((f) => ({ ...f, foreignDisplay: e.target.value }))
                  }
                  placeholder="USD 150"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={submitting || isFallbackRecord}
            >
              <Plus className="h-4 w-4" />
              {feeForm.id ? "Update Fee Draft" : "Save Fee Draft"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registration Fee Schedule ({fees.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {fees.map((fee) => (
            <div
              key={fee.id}
              className="py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{fee.category}</span>
                  <Badge variant={fee.status} className="capitalize">
                    {fee.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  India: <strong>₹{fee.amountInr.toLocaleString("en-IN")}</strong> ({fee.indianDisplay}) •{" "}
                  Foreign: <strong>${fee.amountUsd}</strong> ({fee.foreignDisplay})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {fee.status !== "published" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={!canApprove || isFallbackRecord}
                    title={
                      !canApprove
                        ? "Financial approval required"
                        : "Approve & publish fee"
                    }
                    onClick={() => handlePublishFee(fee.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Publish Fee
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isFallbackRecord || (!canApprove && fee.status !== "draft")}
                  onClick={() =>
                    setFeeForm({
                      id: fee.id,
                      category: fee.category,
                      amountInr: fee.amountInr,
                      amountUsd: fee.amountUsd,
                      indianDisplay: fee.indianDisplay,
                      foreignDisplay: fee.foreignDisplay,
                      taxNote: fee.taxNote,
                      sortOrder: fee.sortOrder,
                      status: fee.status,
                    })
                  }
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isFallbackRecord || (!canApprove && fee.status !== "draft")}
                  onClick={async () => {
                    const r = await deleteRegistrationFeeAction(fee.id, editionYear);
                    if (!r.ok) setFeedback({ type: "error", message: r.error });
                    else router.refresh();
                  }}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank Transfer & UPI Instructions</CardTitle>
          <CardDescription>
            Protected by financial approval permission before publishing changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveBank} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="bk-upi">UPI ID</Label>
                <Input
                  id="bk-upi"
                  value={bankForm.upiId}
                  onChange={(e) =>
                    setBankForm((b) => ({ ...b, upiId: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-name">Bank Name</Label>
                <Input
                  id="bk-name"
                  value={bankForm.bankTransfer.bankName}
                  onChange={(e) =>
                    setBankForm((b) => ({
                      ...b,
                      bankTransfer: { ...b.bankTransfer, bankName: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-party">Beneficiary / Party Name</Label>
                <Input
                  id="bk-party"
                  value={bankForm.bankTransfer.partyName}
                  onChange={(e) =>
                    setBankForm((b) => ({
                      ...b,
                      bankTransfer: { ...b.bankTransfer, partyName: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-acct">Account Number</Label>
                <Input
                  id="bk-acct"
                  value={bankForm.bankTransfer.accountNo}
                  onChange={(e) =>
                    setBankForm((b) => ({
                      ...b,
                      bankTransfer: { ...b.bankTransfer, accountNo: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-ifsc">IFSC Code</Label>
                <Input
                  id="bk-ifsc"
                  value={bankForm.bankTransfer.ifscCode}
                  onChange={(e) =>
                    setBankForm((b) => ({
                      ...b,
                      bankTransfer: { ...b.bankTransfer, ifscCode: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bk-swift">SWIFT Code</Label>
                <Input
                  id="bk-swift"
                  value={bankForm.bankTransfer.swiftCode}
                  onChange={(e) =>
                    setBankForm((b) => ({
                      ...b,
                      bankTransfer: { ...b.bankTransfer, swiftCode: e.target.value },
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bk-conf">Confirmation Instructions</Label>
              <Textarea
                id="bk-conf"
                rows={2}
                value={bankForm.confirmationEmailInstruction}
                onChange={(e) =>
                  setBankForm((b) => ({
                    ...b,
                    confirmationEmailInstruction: e.target.value,
                  }))
                }
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={!canApprove || submitting || isFallbackRecord}
              title={
                !canApprove
                  ? "Financial approval required"
                  : "Save payment instructions"
              }
            >
              Save Payment Instructions
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
