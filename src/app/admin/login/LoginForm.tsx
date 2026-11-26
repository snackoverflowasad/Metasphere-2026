"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Lock, Mail, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { createBrowserSupabase } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid institutional email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export interface LoginFormProps {
  supabaseConfigured: boolean;
}

export function LoginForm({ supabaseConfigured }: LoginFormProps) {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setAuthError(null);

    if (!supabaseConfigured) {
      setAuthError(
        "Supabase not configured yet — see docs/operations/supabase-handoff.md."
      );
      return;
    }

    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setAuthError(error.message || "Invalid email or password.");
        return;
      }

      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalData?.currentLevel === "aal2") {
        router.replace("/admin/overview");
      } else {
        router.replace("/admin/mfa");
      }
      router.refresh();
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again."
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#fffbf5] text-[#1a202c] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-orange-200/80 rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
              MetaSphere CMS
            </p>
            <h1 className="text-2xl font-bold text-[#1a202c]">
              Administrator Sign In
            </h1>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Invite-only access for conference organizers. TOTP multi-factor
          authentication is required after signing in.
        </p>

        {!supabaseConfigured && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-semibold">
                  Supabase not configured yet — see{" "}
                  <code className="font-mono text-xs bg-amber-100 px-1 py-0.5 rounded">
                    docs/operations/supabase-handoff.md
                  </code>
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Add{" "}
                  <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
                  <code className="font-mono">
                    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                  </code>
                  , and <code className="font-mono">SUPABASE_SECRET_KEY</code> to{" "}
                  <code className="font-mono">.env.local</code>, push
                  migrations, and seed an invited{" "}
                  <code className="font-mono">super_admin</code> to enable
                  login.
                </p>
              </div>
            </div>
          </div>
        )}

        {authError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {authError}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-800 mb-1.5"
            >
              Institutional Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                disabled={!supabaseConfigured || isSubmitting}
                placeholder="coordinator@iem.edu.in"
                {...register("email")}
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-800 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                disabled={!supabaseConfigured || isSubmitting}
                placeholder="Enter your password"
                {...register("password")}
                className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!supabaseConfigured || isSubmitting}
            className="w-full rounded-lg bg-[#f97316] hover:bg-[#ea580c] disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 text-sm shadow-sm transition cursor-pointer"
          >
            {isSubmitting ? "Signing in..." : "Sign In & Continue to MFA"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Accounts are provisioned by Super Admin invitation only.</span>
          <Link
            href="/"
            className="font-medium text-orange-600 hover:text-orange-700 shrink-0 ml-2"
          >
            Public Site
          </Link>
        </div>
      </div>
    </main>
  );
}
