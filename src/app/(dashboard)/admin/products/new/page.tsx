import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import TopBar from "@/components/layout/TopBar";
import ProductForm from "../_components/ProductForm";

// ─── Auth gate ────────────────────────────────────────────────────────────────
async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const staffRoles = ["admin", "manager", "marketing"];
  if (!profile || !staffRoles.includes(profile.role)) redirect("/dashboard");

  return { user, role: profile.role };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export const metadata = {
  title: "Thêm sản phẩm mới | Admin",
};

export default async function NewProductPage() {
  await requireStaff();
  const supabase = await createClient();

  // Load categories for select dropdown
  const { data: categories } = await supabase
    .from("product_categories")
    .select("id, name, parent_id")
    .eq("is_visible", true)
    .order("position", { ascending: true });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <TopBar title="Thêm sản phẩm mới" subtitle="Tạo sách, merch hoặc sản phẩm số mới cho cửa hàng" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#D4A843] transition-colors mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            Quay lại danh sách sản phẩm
          </Link>
          <h1 className="text-2xl font-bold text-white">Thêm sản phẩm mới</h1>
          <p className="text-sm text-gray-400 mt-1">
            Tạo sách, merch hoặc sản phẩm số mới cho cửa hàng.
          </p>
        </div>

        <ProductForm
          mode="create"
          categories={categories ?? []}
        />
      </main>
    </div>
  );
}
