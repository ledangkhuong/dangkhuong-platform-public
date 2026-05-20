import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check admin role from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const staffRoles = ["admin", "manager", "marketing", "sale", "support", "editor"];
  if (!profile || !staffRoles.includes(profile.role)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
