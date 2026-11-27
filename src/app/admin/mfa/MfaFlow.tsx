"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  KeyRound,
  LogOut,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { z } from "zod";
import { createBrowserSupabase } from "@/lib/supabase/client";

const totpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

type TotpFormValues = z.infer<typeof totpSchema>;

type MfaStage =
  | { kind: "loading" }
  | { kind: "unconfigured" }
  | { kind: "verify"; factorId: string }
  | {
      kind: "enroll";
      factorId: string;
      qrCodeUrl: string;
      secret: string;
    }
  | { kind: "error"; message: string };

function toQrDataUrl(qrCode: string): string {
  if (qrCode.startsWith("data:")) {
    return qrCode;
  }
  return `data:image/svg+xml;utf-8,${encodeURIComponent(qrCode)}`;
}

export interface MfaFlowProps {
  supabaseConfigured: boolean;
}

export function MfaFlow({ supabaseConfigured }: MfaFlowProps) {
  const router = useRouter();
  const [stage, setStage] = useState<MfaStage>(
    supabaseConfigured ? { kind: "loading" } : { kind: "unconfigured" }
  );
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const inFlightInitRef = useRef<Promise<
    MfaStage | { kind: "redirect"; to: string }
  > | null>(null);
  const isMountedRef = useRef(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TotpFormValues>({
    resolver: zodResolver(totpSchema),
    defaultValues: { code: "" },
  });

  const resolveMfaOutcome = useCallback(async (): Promise<
    MfaStage | { kind: "redirect"; to: string }
  > => {
    try {
      const supabase = createBrowserSupabase();
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        return { kind: "redirect", to: "/admin/login" };
      }

      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalData?.currentLevel === "aal2") {
        return { kind: "redirect", to: "/admin/overview" };
      }

      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError) {
        return {
          kind: "error",
          message: factorsError.message || "Unable to load MFA factors.",
        };
      }

      const verifiedTotp = factorsData.totp[0];
      if (verifiedTotp) {
        return { kind: "verify", factorId: verifiedTotp.id };
      }

      // Remove stale unverified TOTP enrollments before issuing a fresh QR code
      const unverifiedTotps = factorsData.all.filter(
        (factor) =>
          factor.factor_type === "totp" && factor.status === "unverified"
      );
      for (const stale of unverifiedTotps) {
        await supabase.auth.mfa.unenroll({ factorId: stale.id });
      }

      const { data: enrollData, error: enrollError } =
        await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "MetaSphere Admin Authenticator",
          issuer: "MetaSphere",
        });

      if (enrollError || !enrollData) {
        return {
          kind: "error",
          message:
            enrollError?.message ||
            "Unable to start TOTP authenticator enrollment.",
        };
      }

      return {
        kind: "enroll",
        factorId: enrollData.id,
        qrCodeUrl: toQrDataUrl(enrollData.totp.qr_code),
        secret: enrollData.totp.secret,
      };
    } catch (err) {
      return {
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "Unexpected error initializing MFA.",
      };
    }
  }, []);

  const initializeMfa = useCallback(
    async (isCancelled?: () => boolean) => {
      if (!supabaseConfigured) {
        setStage({ kind: "unconfigured" });
        return;
      }

      setStage({ kind: "loading" });
      setVerifyError(null);

      // Deduplicate concurrent calls (e.g. React StrictMode double-mount) so only
      // one listFactors/unenroll/enroll sequence runs on the server.
      if (!inFlightInitRef.current) {
        inFlightInitRef.current = resolveMfaOutcome().finally(() => {
          inFlightInitRef.current = null;
        });
      }

      const outcome = await inFlightInitRef.current;
      if (!isMountedRef.current || isCancelled?.()) {
        return;
      }

      if (outcome.kind === "redirect") {
        router.replace(outcome.to);
        return;
      }

      setStage(outcome);
    },
    [resolveMfaOutcome, router, supabaseConfigured]
  );

  useEffect(() => {
    isMountedRef.current = true;
    let cancelled = false;
    void initializeMfa(() => cancelled);
    return () => {
      cancelled = true;
      isMountedRef.current = false;
    };
  }, [initializeMfa]);

  const onVerify = async (values: TotpFormValues) => {
    if (stage.kind !== "verify" && stage.kind !== "enroll") {
      return;
    }

    setVerifyError(null);

    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: stage.factorId,
        code: values.code,
      });

      if (error) {
        setVerifyError(
          error.message || "Invalid verification code. Please try again."
        );
        return;
      }

      router.replace("/admin/overview");
      router.refresh();
    } catch (err) {
      setVerifyError(
        err instanceof Error ? err.message : "Failed to verify TOTP code."
      );
    }
  };

  const handleSignOut = async () => {
    if (supabaseConfigured) {
      const supabase = createBrowserSupabase();
      await supabase.auth.signOut();
    }
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#fffbf5] text-[#1a202c] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-orange-200/80 rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
                Mandatory AAL2 Security
              </p>
              <h1 className="text-xl font-bold text-[#1a202c]">
                Authenticator Verification
              </h1>
            </div>
          </div>

          {supabaseConfigured && (
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          )}
        </div>

        {stage.kind === "unconfigured" && (
          <div
            role="status"
            className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-3"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="font-semibold">
                Supabase not configured yet — see{" "}
                <code className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">
                  docs/operations/supabase-handoff.md
                </code>
              </p>
            </div>
            <Link
              href="/admin/login"
              className="inline-block text-xs font-semibold text-orange-700 hover:text-orange-800 underline"
            >
              Return to Admin Sign In
            </Link>
          </div>
        )}

        {stage.kind === "loading" && (
          <div className="py-10 text-center text-sm text-gray-600">
            Checking authenticator status...
          </div>
        )}

        {stage.kind === "error" && (
          <div className="space-y-4">
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {stage.message}
            </div>
            <button
              type="button"
              onClick={() => void initializeMfa()}
              className="w-full rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold py-2.5 px-4 text-sm transition cursor-pointer"
            >
              Retry MFA Setup
            </button>
          </div>
        )}

        {(stage.kind === "enroll" || stage.kind === "verify") && (
          <div className="space-y-5">
            {stage.kind === "enroll" ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  Scan this QR code with Google Authenticator, 1Password,
                  Microsoft Authenticator, or Authy, then enter the 6-digit code
                  to elevate your session to <code className="font-mono">aal2</code>.
                </p>
                <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-[#fffbf5] p-5">
                  <img
                    src={stage.qrCodeUrl}
                    alt="TOTP Authenticator QR Code"
                    className="w-44 h-44 rounded-lg bg-white p-2 border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((prev) => !prev)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    {showSecret
                      ? "Hide manual setup key"
                      : "Can't scan? Show manual setup key"}
                  </button>
                  {showSecret && (
                    <code className="mt-2 select-all rounded bg-white px-3 py-1.5 text-xs font-mono text-gray-800 border border-gray-200 break-all text-center">
                      {stage.secret}
                    </code>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed">
                Enter the current 6-digit verification code from your enrolled
                authenticator app to unlock the MetaSphere Admin Console.
              </p>
            )}

            {verifyError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {verifyError}
              </div>
            )}

            <form
              onSubmit={handleSubmit(onVerify)}
              className="space-y-4"
              noValidate
            >
              <div>
                <label
                  htmlFor="totp-code"
                  className="block text-sm font-medium text-gray-800 mb-1.5"
                >
                  6-Digit Authenticator Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="totp-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    disabled={isSubmitting}
                    placeholder="123456"
                    {...register("code")}
                    className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3.5 py-2.5 text-base tracking-widest font-mono text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
                {errors.code && (
                  <p className="mt-1.5 text-xs text-red-600">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-[#f97316] hover:bg-[#ea580c] disabled:bg-orange-300 text-white font-semibold py-2.5 px-4 text-sm shadow-sm transition cursor-pointer"
              >
                {isSubmitting
                  ? "Verifying code..."
                  : "Verify & Unlock Admin Console"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
