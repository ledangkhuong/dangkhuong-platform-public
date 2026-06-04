import TopBar from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/server";
import { getActiveSubscription } from "@/lib/subscription";
import PricingSection from "@/components/subscriptions/PricingSection";
import SubscriptionStatus from "@/components/subscriptions/SubscriptionStatus";

export const dynamic = "force-dynamic";

// ─── Sidebar integration note ───────────────────────────────────────────────
// Add to mainNav in Sidebar.tsx:
//   { href: "/subscriptions", icon: CreditCard, label: "Gói đăng ký" }
// Add to adminNav in Sidebar.tsx:
//   { href: "/admin/subscriptions", icon: CreditCard, label: "Quản lý Gói", roles: ["admin", "manager"] }

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user has active subscription
  let hasActiveSub = false;
  if (user) {
    const sub = await getActiveSubscription(user.id);
    hasActiveSub = sub !== null;
  }

  return (
    <div>
      <TopBar
        title="Gói đăng ký"
        subtitle="Chọn gói phù hợp để truy cập toàn bộ nội dung"
      />

      <div className="p-6 max-w-5xl mx-auto space-y-8">
        {/* If user has active sub, show status first */}
        {hasActiveSub && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">
              Gói hiện tại của bạn
            </h2>
            <SubscriptionStatus />
          </div>
        )}

        {/* Pricing section */}
        <div>
          <h2 className="text-lg font-bold text-white mb-2">
            {hasActiveSub
              ? "Nâng cấp gói đăng ký"
              : "Chọn gói đăng ký"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {hasActiveSub
              ? "Bạn có thể nâng cấp lên gói cao hơn bất cứ lúc nào."
              : "Đăng ký để mở khoá toàn bộ khoá học và tài nguyên."}
          </p>
          <PricingSection />
        </div>

        {/* If no sub, show status widget too (it shows "no subscription" message) */}
        {!hasActiveSub && user && (
          <div>
            <SubscriptionStatus />
          </div>
        )}
      </div>
    </div>
  );
}
