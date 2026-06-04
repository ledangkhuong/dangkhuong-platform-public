"use server";

/**
 * FormData wrappers cho category Server Actions.
 *
 * Vì createCategory/updateCategory/deleteCategory trong @/lib/actions/products
 * nhận object (CategoryInput) thay vì FormData, ta wrap ở đây để dùng được trực
 * tiếp trong <form action={...}>.
 */

import { revalidatePath } from "next/cache";
import {
  createCategory as createCategoryAction,
  updateCategory as updateCategoryAction,
  deleteCategory as deleteCategoryAction,
} from "@/lib/actions/products";

function str(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length === 0 ? undefined : s;
}

function num(formData: FormData, key: string): number | undefined {
  const s = str(formData, key);
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function bool(formData: FormData, key: string): boolean {
  const v = formData.get(key);
  return v === "on" || v === "true" || v === "1";
}

/** Tạo category mới từ form data. */
export async function createCategoryFromForm(formData: FormData): Promise<void> {
  const name = str(formData, "name");
  const slug = str(formData, "slug");
  if (!name || !slug) return;

  await createCategoryAction({
    name,
    slug,
    description: str(formData, "description") ?? null,
    parent_id: str(formData, "parent_id") ?? null,
    thumbnail_url: str(formData, "thumbnail_url") ?? null,
    position: num(formData, "position") ?? 0,
    is_visible: bool(formData, "is_visible"),
  });

  revalidatePath("/admin/products/categories");
}

/** Update category với id bind sẵn. */
export async function updateCategoryFromForm(
  id: string,
  formData: FormData,
): Promise<void> {
  const name = str(formData, "name");
  const slug = str(formData, "slug");
  if (!name || !slug) return;

  await updateCategoryAction(id, {
    name,
    slug,
    description: str(formData, "description") ?? null,
    parent_id: str(formData, "parent_id") ?? null,
    thumbnail_url: str(formData, "thumbnail_url") ?? null,
    position: num(formData, "position") ?? 0,
    is_visible: bool(formData, "is_visible"),
  });

  revalidatePath("/admin/products/categories");
}

/** Xoá category với id bind sẵn. */
export async function deleteCategoryFromForm(id: string): Promise<void> {
  await deleteCategoryAction(id);
  revalidatePath("/admin/products/categories");
}
