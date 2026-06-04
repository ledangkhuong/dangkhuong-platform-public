"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ChevronDown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createProduct, updateProduct } from "@/lib/actions/products";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductCategory = {
  id: string;
  name: string;
  parent_id: string | null;
};

export type VariantInput = {
  /** Existing variant id (when editing). Undefined for new rows. */
  id?: string;
  name: string;
  sku: string;
  price: string; // string for input ergonomics, parse on submit
  stock_count: string;
  attributes: Array<{ key: string; value: string }>;
};

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  product_type: "book" | "merch" | "digital";
  status: "draft" | "active" | "archived";
  price: string;
  compare_at_price: string;
  sku: string;
  weight_grams: string;
  thumbnail_url: string;
  gallery_urls: string; // textarea: one URL per line
  tags: string; // comma-separated
  category_id: string;
  seo_title: string;
  seo_description: string;
  focus_keyword: string;
  variants: VariantInput[];
};

type Props = {
  mode: "create" | "edit";
  categories: ProductCategory[];
  initialValues?: Partial<ProductFormValues>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Vietnamese-aware slug generator (removes accents, lowercases, hyphenates). */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const EMPTY_VARIANT: VariantInput = {
  name: "",
  sku: "",
  price: "",
  stock_count: "0",
  attributes: [],
};

const DEFAULTS: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  short_description: "",
  product_type: "book",
  status: "draft",
  price: "",
  compare_at_price: "",
  sku: "",
  weight_grams: "",
  thumbnail_url: "",
  gallery_urls: "",
  tags: "",
  category_id: "",
  seo_title: "",
  seo_description: "",
  focus_keyword: "",
  variants: [],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductForm({ mode, categories, initialValues }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState<boolean>(
    Boolean(initialValues?.slug),
  );
  const [seoOpen, setSeoOpen] = useState(false);

  const [values, setValues] = useState<ProductFormValues>(() => ({
    ...DEFAULTS,
    ...initialValues,
    variants: initialValues?.variants ?? [],
  }));

  // Flattened category options with simple parent/child indent.
  const categoryOptions = useMemo(() => {
    const byParent = new Map<string | null, ProductCategory[]>();
    for (const c of categories) {
      const key = c.parent_id ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(c);
    }
    const out: Array<{ id: string; label: string }> = [];
    const walk = (parent: string | null, depth: number) => {
      const list = byParent.get(parent) ?? [];
      for (const c of list) {
        out.push({ id: c.id, label: `${"— ".repeat(depth)}${c.name}` });
        walk(c.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [categories]);

  // ── Update helpers ──
  function update<K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleNameChange(name: string) {
    setValues((v) => ({
      ...v,
      name,
      slug: slugTouched ? v.slug : slugify(name),
    }));
  }

  function handleSlugChange(slug: string) {
    setSlugTouched(true);
    update("slug", slug);
  }

  // ── Variants ──
  function addVariant() {
    setValues((v) => ({
      ...v,
      variants: [...v.variants, { ...EMPTY_VARIANT, attributes: [] }],
    }));
  }
  function removeVariant(idx: number) {
    setValues((v) => ({
      ...v,
      variants: v.variants.filter((_, i) => i !== idx),
    }));
  }
  function updateVariant<K extends keyof VariantInput>(
    idx: number,
    key: K,
    value: VariantInput[K],
  ) {
    setValues((v) => {
      const next = [...v.variants];
      next[idx] = { ...next[idx], [key]: value };
      return { ...v, variants: next };
    });
  }
  function addAttribute(idx: number) {
    setValues((v) => {
      const next = [...v.variants];
      next[idx] = {
        ...next[idx],
        attributes: [...next[idx].attributes, { key: "", value: "" }],
      };
      return { ...v, variants: next };
    });
  }
  function removeAttribute(vIdx: number, aIdx: number) {
    setValues((v) => {
      const next = [...v.variants];
      next[vIdx] = {
        ...next[vIdx],
        attributes: next[vIdx].attributes.filter((_, i) => i !== aIdx),
      };
      return { ...v, variants: next };
    });
  }
  function updateAttribute(
    vIdx: number,
    aIdx: number,
    key: "key" | "value",
    value: string,
  ) {
    setValues((v) => {
      const next = [...v.variants];
      const attrs = [...next[vIdx].attributes];
      attrs[aIdx] = { ...attrs[aIdx], [key]: value };
      next[vIdx] = { ...next[vIdx], attributes: attrs };
      return { ...v, variants: next };
    });
  }

  // ── Submit ──
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!values.name.trim()) {
      setError("Vui lòng nhập tên sản phẩm.");
      return;
    }
    if (!values.slug.trim()) {
      setError("Slug không được để trống.");
      return;
    }
    if (!values.price || Number.isNaN(Number(values.price))) {
      setError("Vui lòng nhập giá hợp lệ.");
      return;
    }

    const payload = serialize(values);

    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createProduct(payload)
            : await updateProduct(values.id!, payload);

        if (result && "error" in result && result.error) {
          setError(result.error);
          return;
        }
        router.push("/admin/products");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Đã xảy ra lỗi không xác định khi lưu sản phẩm.",
        );
      }
    });
  }

  // ── Render ──
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-300"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Basic info ── */}
      <Section title="Thông tin cơ bản">
        <Field label="Tên sản phẩm" required>
          <Input
            value={values.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="VD: Sách Khôn Ngoan Tài Chính"
            required
          />
        </Field>

        <Field label="Slug" required hint="Tự động tạo từ tên, có thể chỉnh sửa.">
          <Input
            value={values.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="sach-khon-ngoan-tai-chinh"
            required
          />
        </Field>

        <Field label="Mô tả ngắn">
          <Textarea
            value={values.short_description}
            onChange={(e) => update("short_description", e.target.value)}
            placeholder="1-2 câu tóm tắt hiển thị trên thẻ sản phẩm"
            rows={2}
          />
        </Field>

        <Field label="Mô tả đầy đủ">
          <Textarea
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Mô tả chi tiết sản phẩm (hỗ trợ markdown)"
            rows={6}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Loại sản phẩm" required>
            <Select
              value={values.product_type}
              onChange={(v) =>
                update("product_type", v as ProductFormValues["product_type"])
              }
            >
              <option value="book">Sách</option>
              <option value="merch">Merch</option>
              <option value="digital">Số</option>
            </Select>
          </Field>

          <Field label="Trạng thái" required>
            <Select
              value={values.status}
              onChange={(v) => update("status", v as ProductFormValues["status"])}
            >
              <option value="draft">Bản nháp</option>
              <option value="active">Đang bán</option>
              <option value="archived">Đã lưu trữ</option>
            </Select>
          </Field>

          <Field label="Danh mục">
            <Select
              value={values.category_id}
              onChange={(v) => update("category_id", v)}
            >
              <option value="">— Chưa phân loại —</option>
              {categoryOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      {/* ── Pricing & inventory ── */}
      <Section title="Giá & kho">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Giá bán (VND)" required>
            <Input
              type="number"
              min={0}
              step={1000}
              value={values.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder="299000"
              required
            />
          </Field>

          <Field
            label="Giá gốc / Giá so sánh (VND)"
            hint="Để hiển thị giá gạch ngang khi giảm giá"
          >
            <Input
              type="number"
              min={0}
              step={1000}
              value={values.compare_at_price}
              onChange={(e) => update("compare_at_price", e.target.value)}
              placeholder="399000"
            />
          </Field>

          <Field label="SKU">
            <Input
              value={values.sku}
              onChange={(e) => update("sku", e.target.value)}
              placeholder="DK-BOOK-001"
            />
          </Field>

          <Field label="Trọng lượng (gram)" hint="Cho tính phí ship">
            <Input
              type="number"
              min={0}
              value={values.weight_grams}
              onChange={(e) => update("weight_grams", e.target.value)}
              placeholder="350"
            />
          </Field>
        </div>
      </Section>

      {/* ── Media ── */}
      <Section title="Hình ảnh">
        <Field label="Ảnh đại diện (thumbnail URL)">
          <Input
            type="url"
            value={values.thumbnail_url}
            onChange={(e) => update("thumbnail_url", e.target.value)}
            placeholder="https://..."
          />
        </Field>

        <Field
          label="Gallery URLs"
          hint="Mỗi dòng một URL. Hỗ trợ tối đa ~10 ảnh."
        >
          <Textarea
            value={values.gallery_urls}
            onChange={(e) => update("gallery_urls", e.target.value)}
            placeholder={"https://...\nhttps://..."}
            rows={4}
            className="font-mono text-xs"
          />
        </Field>

        <Field
          label="Tags"
          hint="Phân tách bằng dấu phẩy. VD: tài chính, đầu tư, best-seller"
        >
          <Input
            value={values.tags}
            onChange={(e) => update("tags", e.target.value)}
            placeholder="tài chính, đầu tư"
          />
        </Field>
      </Section>

      {/* ── Variants ── */}
      <Section
        title="Biến thể"
        description="Bỏ trống nếu sản phẩm chỉ có 1 phiên bản."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addVariant}
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm biến thể
          </Button>
        }
      >
        {values.variants.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Chưa có biến thể nào. Nhấn &quot;Thêm biến thể&quot; nếu sản phẩm có
            nhiều phiên bản (size, màu, ...).
          </p>
        ) : (
          <div className="space-y-4">
            {values.variants.map((variant, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-gray-800 bg-black/30 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-200">
                    Biến thể #{idx + 1}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeVariant(idx)}
                    aria-label="Xoá biến thể"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Field label="Tên biến thể">
                    <Input
                      value={variant.name}
                      onChange={(e) =>
                        updateVariant(idx, "name", e.target.value)
                      }
                      placeholder="Bìa cứng"
                    />
                  </Field>
                  <Field label="SKU">
                    <Input
                      value={variant.sku}
                      onChange={(e) =>
                        updateVariant(idx, "sku", e.target.value)
                      }
                      placeholder="DK-BOOK-001-HC"
                    />
                  </Field>
                  <Field label="Giá override (VND)">
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={variant.price}
                      onChange={(e) =>
                        updateVariant(idx, "price", e.target.value)
                      }
                      placeholder="(dùng giá chung)"
                    />
                  </Field>
                  <Field label="Tồn kho">
                    <Input
                      type="number"
                      min={0}
                      value={variant.stock_count}
                      onChange={(e) =>
                        updateVariant(idx, "stock_count", e.target.value)
                      }
                    />
                  </Field>
                </div>

                {/* Attributes (jsonb) */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Thuộc tính (key = value)
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => addAttribute(idx)}
                    >
                      <Plus className="w-3 h-3" />
                      Thêm
                    </Button>
                  </div>

                  {variant.attributes.length === 0 ? (
                    <p className="text-xs text-gray-600 italic">
                      Chưa có thuộc tính.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {variant.attributes.map((attr, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-2">
                          <Input
                            value={attr.key}
                            onChange={(e) =>
                              updateAttribute(
                                idx,
                                aIdx,
                                "key",
                                e.target.value,
                              )
                            }
                            placeholder="color"
                            className="flex-1"
                          />
                          <span className="text-gray-500">=</span>
                          <Input
                            value={attr.value}
                            onChange={(e) =>
                              updateAttribute(
                                idx,
                                aIdx,
                                "value",
                                e.target.value,
                              )
                            }
                            placeholder="red"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeAttribute(idx, aIdx)}
                            aria-label="Xoá thuộc tính"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── SEO accordion ── */}
      <div className="rounded-lg border border-gray-800 bg-[#111] overflow-hidden">
        <button
          type="button"
          onClick={() => setSeoOpen((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-900/40 transition-colors"
          aria-expanded={seoOpen}
        >
          <span className="text-sm font-semibold text-white">
            SEO (Tối ưu công cụ tìm kiếm)
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              seoOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {seoOpen && (
          <div className="border-t border-gray-800 px-4 py-4 space-y-4">
            <Field label="SEO Title" hint="Tiêu đề hiển thị trên Google (~60 ký tự)">
              <Input
                value={values.seo_title}
                onChange={(e) => update("seo_title", e.target.value)}
                placeholder="Sách Khôn Ngoan Tài Chính - Đăng Khương"
                maxLength={70}
              />
            </Field>
            <Field
              label="SEO Description"
              hint="Mô tả meta description (~160 ký tự)"
            >
              <Textarea
                value={values.seo_description}
                onChange={(e) => update("seo_description", e.target.value)}
                rows={3}
                maxLength={200}
              />
            </Field>
            <Field label="Focus Keyword">
              <Input
                value={values.focus_keyword}
                onChange={(e) => update("focus_keyword", e.target.value)}
                placeholder="khôn ngoan tài chính"
              />
            </Field>
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/products")}
          disabled={isPending}
        >
          Huỷ
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-[#D4A843] text-black hover:bg-[#D4A843]/90"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang lưu...
            </>
          ) : mode === "create" ? (
            "Tạo sản phẩm"
          ) : (
            "Lưu thay đổi"
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-800 bg-[#111] p-5">
      <header className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
        {action}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-[#D4A843] ml-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-lg border border-input bg-transparent dark:bg-input/30 px-3 py-1.5 text-sm text-gray-100 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {children}
    </select>
  );
}

// ─── Serialize helper ─────────────────────────────────────────────────────────

/** Convert form values into the shape expected by the server action. */
function serialize(v: ProductFormValues) {
  const galleryUrls = v.gallery_urls
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const tags = v.tags
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    name: v.name.trim(),
    slug: v.slug.trim(),
    description: v.description.trim() || null,
    short_description: v.short_description.trim() || null,
    product_type: v.product_type,
    status: v.status,
    price: Number(v.price),
    compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
    sku: v.sku.trim() || null,
    weight_grams: v.weight_grams ? Number(v.weight_grams) : null,
    thumbnail_url: v.thumbnail_url.trim() || null,
    gallery_urls: galleryUrls,
    tags,
    category_id: v.category_id || null,
    seo_title: v.seo_title.trim() || null,
    seo_description: v.seo_description.trim() || null,
    focus_keyword: v.focus_keyword.trim() || null,
    variants: v.variants.map((variant) => ({
      id: variant.id,
      name: variant.name.trim(),
      sku: variant.sku.trim() || null,
      price: variant.price ? Number(variant.price) : null,
      stock_count: Number(variant.stock_count) || 0,
      attributes: Object.fromEntries(
        variant.attributes
          .filter((a) => a.key.trim())
          .map((a) => [a.key.trim(), a.value.trim()]),
      ),
    })),
  };
}
