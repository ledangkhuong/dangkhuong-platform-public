import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopBar from "@/components/layout/TopBar";
import AnalyticsDashboard from "@/components/admin/analytics/AnalyticsDashboard";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "manager"].includes(profile?.role ?? "")) redirect("/dashboard");

  return (
    <div>
      <TopBar
        title="Analytics Dashboard"
        subtitle="Phân tích doanh thu, học viên, đơn hàng và hiệu suất sản phẩm"
      />
      <div className="p-6 max-w-7xl mx-auto">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
