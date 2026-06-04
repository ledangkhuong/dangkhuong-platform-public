/**
 * Admin — Quản lý danh mục sản phẩm (Week 2 / Catalog).
 *
 * Server Component CRUD đơn giản:
 *  - Hiển thị toàn bộ category dạng cây (parent → children, indent theo depth).
 *  - Inline form thêm category (name + slug + parent + position).
 *  - Mỗi row có form edit (name + slug + position + is_visible + parent)
 *    và nút delete.
 *
 * Auth gate: requireStaff() từ @/lib/auth.
 * Data: getCategories() từ @/lib/ecommerce/queries (build tree sẵn).
 * Mutations: createCategory / updateCategory / deleteCategory
 *   từ @/lib/actions/products (Server Actions).
 *
 * Style: dark theme (#0a0a0a), accent vàng #D4A843, tận dụng class
 * `card-dark`, `input-dark`, `btn-green` đã có trong global CSS của project.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCategories, type ProductCategoryNode } from "@/lib/ecommerce/queries";
import {
  createCategoryFromForm,
  updateCategoryFromForm,
  deleteCategoryFromForm,
} from "./_actions";
import TopBar from "@/components/layout/TopBar";
import {
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  CornerDownRight,
} from "lucide-react";

// Server Component — luôn lấy dữ liệu mới nhất sau mutation.
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface FlatCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  position: number;
  is_visible: boolean;
  depth: number;
}

/**
 * Duyệt tree thành danh sách phẳng kèm `depth` để render bảng indent.
 * Thứ tự duyệt: DFS theo `position ASC` (đã được query sort sẵn).
 */
function flattenTree(
  nodes: ProductCategoryNode[],
  depth = 0,
  out: FlatCategory[] = []
): FlatCategory[] {
  for (const node of nodes) {
    out.push({
      id: node.id,
      name: node.name,
      slug: node.slug,
      parent_id: node.parent_id,
      position: node.position,
      is_visible: node.is_visible,
      depth,
    });
    if (node.children.length > 0) {
      flattenTree(node.children, depth + 1, out);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminCategoriesPage() {
  // Auth gate (staff only) — inline pattern vì chưa có `@/lib/auth` helper
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const staffRoles = ["admin", "manager", "marketing", "sale", "support"];
  if (!profile || !staffRoles.includes(profile.role)) {
    redirect("/dashboard");
  }

  const tree = await getCategories();
  const flat = flattenTree(tree);

  // Options cho <select parent_id> ở form thêm/sửa. Mỗi entry hiển thị
  // theo depth để admin nhìn rõ cấu trúc cha-con.
  const parentOptions = flat.map((c) => ({
    id: c.id,
    label: `${"— ".repeat(c.depth)}${c.name}`,
  }));

  return (
    <div>
      <TopBar
        title="Danh mục sản phẩm"
        subtitle="Quản lý cây danh mục cho sách, merch, sản phẩm số"
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* ---------- Form thêm mới ---------- */}
        <section className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <Plus size={18} className="text-[#D4A843]" />
            <h3 className="text-sm font-bold text-white">Thêm danh mục</h3>
          </div>

          <form
            action={createCategoryFromForm}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3"
          >
            <div className="sm:col-span-4">
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                Tên danh mục <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                maxLength={150}
                placeholder="VD: Sách kinh doanh"
                className="input-dark w-full text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                Slug (tuỳ chọn)
              </label>
              <input
                type="text"
                name="slug"
                maxLength={150}
                placeholder="sach-kinh-doanh"
                pattern="[a-z0-9\-]*"
                className="input-dark w-full text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                Danh mục cha
              </label>
              <select
                name="parent_id"
                defaultValue=""
                className="input-dark w-full text-sm"
              >
                <option value="">— Không có (root) —</option>
                {parentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                Vị trí
              </label>
              <input
                type="number"
                name="position"
                defaultValue={0}
                min={0}
                step={1}
                className="input-dark w-full text-sm"
              />
            </div>

            <div className="sm:col-span-12 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_visible"
                  defaultChecked
                  value="on"
                  className="w-4 h-4 rounded"
                  style={{ accentColor: "#D4A843" }}
                />
                Hiển thị công khai
              </label>

              <button
                type="submit"
                className="btn-green flex items-center gap-2 text-sm"
              >
                <Plus size={15} />
                Thêm danh mục
              </button>
            </div>
          </form>
        </section>

        {/* ---------- Danh sách dạng cây ---------- */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FolderTree size={16} className="text-gray-400" />
            <h3 className="text-sm font-bold text-white">
              Cây danh mục ({flat.length})
            </h3>
          </div>

          {flat.length === 0 ? (
            <div className="card-dark p-8 text-center">
              <FolderTree size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Chưa có danh mục nào. Hãy tạo danh mục đầu tiên ở form phía trên.
              </p>
            </div>
          ) : (
            <div className="card-dark overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-left text-xs text-gray-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Tên / Slug</th>
                      <th className="px-3 py-3 font-medium w-24">Vị trí</th>
                      <th className="px-3 py-3 font-medium w-28">Hiển thị</th>
                      <th className="px-3 py-3 font-medium w-56">Danh mục cha</th>
                      <th className="px-3 py-3 font-medium w-40 text-right">
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {flat.map((cat) => (
                      <CategoryRow
                        key={cat.id}
                        category={cat}
                        parentOptions={parentOptions.filter(
                          (o) => o.id !== cat.id
                        )}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row component — render inline edit + delete forms
// ---------------------------------------------------------------------------

function CategoryRow({
  category,
  parentOptions,
}: {
  category: FlatCategory;
  parentOptions: { id: string; label: string }[];
}) {
  // Bind id vào server action để tránh hidden input dễ bị tamper.
  const updateAction = updateCategoryFromForm.bind(null, category.id);
  const deleteAction = deleteCategoryFromForm.bind(null, category.id);

  return (
    <tr className="hover:bg-white/[0.02]">
      {/* Name + slug, indent theo depth */}
      <td className="px-4 py-3 align-top">
        <div
          className="flex items-start gap-2"
          style={{ paddingLeft: `${category.depth * 20}px` }}
        >
          {category.depth > 0 && (
            <CornerDownRight
              size={14}
              className="text-gray-600 mt-1 shrink-0"
            />
          )}
          <form
            id={`form-${category.id}`}
            action={updateAction}
            className="flex-1 min-w-0 space-y-2"
          >
            <input
              type="text"
              name="name"
              defaultValue={category.name}
              required
              maxLength={150}
              className="input-dark w-full text-sm font-medium"
            />
            <input
              type="text"
              name="slug"
              defaultValue={category.slug}
              required
              maxLength={150}
              pattern="[a-z0-9\-]+"
              className="input-dark w-full text-xs text-gray-400"
            />
          </form>
        </div>
      </td>

      {/* Position */}
      <td className="px-3 py-3 align-top">
        <input
          type="number"
          name="position"
          form={`form-${category.id}`}
          defaultValue={category.position}
          min={0}
          step={1}
          className="input-dark w-full text-sm"
        />
      </td>

      {/* is_visible */}
      <td className="px-3 py-3 align-top">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="is_visible"
            form={`form-${category.id}`}
            defaultChecked={category.is_visible}
            value="on"
            className="w-4 h-4 rounded"
            style={{ accentColor: "#D4A843" }}
          />
          <span className="text-xs text-gray-400 flex items-center gap-1">
            {category.is_visible ? (
              <>
                <Eye size={12} /> Hiện
              </>
            ) : (
              <>
                <EyeOff size={12} /> Ẩn
              </>
            )}
          </span>
        </label>
      </td>

      {/* Parent select */}
      <td className="px-3 py-3 align-top">
        <select
          name="parent_id"
          form={`form-${category.id}`}
          defaultValue={category.parent_id ?? ""}
          className="input-dark w-full text-sm"
        >
          <option value="">— Root —</option>
          {parentOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>

      {/* Actions */}
      <td className="px-3 py-3 align-top">
        <div className="flex items-center justify-end gap-2">
          <button
            type="submit"
            form={`form-${category.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#D4A843]/10 text-[#D4A843] hover:bg-[#D4A843]/20 text-xs font-medium transition"
            title="Lưu thay đổi"
          >
            <Pencil size={12} />
            Lưu
          </button>

          <form action={deleteAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition"
              title="Xoá danh mục"
            >
              <Trash2 size={12} />
              Xoá
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}
