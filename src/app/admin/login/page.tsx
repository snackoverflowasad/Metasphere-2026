import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <LoginForm supabaseConfigured={isSupabaseConfigured()} />;
}
