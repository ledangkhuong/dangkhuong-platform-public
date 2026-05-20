import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayoutClient from "./DashboardLayoutClient";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Check if OAuth user is missing phone number → force complete profile
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const isOAuth = user.app_metadata?.provider !== "email"
      && user.app_metadata?.providers?.some((p: string) => ["google", "facebook"].includes(p));

    if (isOAuth) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .single();

      if (!profile?.phone) {
        redirect("/complete-profile");
      }
    }
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
