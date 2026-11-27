import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { MfaFlow } from "./MfaFlow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MFA Verification",
  robots: { index: false, follow: false },
};

export default function AdminMfaPage() {
  return <MfaFlow supabaseConfigured={isSupabaseConfigured()} />;
}
