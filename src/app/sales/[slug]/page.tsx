import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { siteConfig, getBaseUrl } from "@/lib/site-config";
import SalesPageTemplate from "@/components/sales/SalesPageTemplate";
import PublicHeader from "@/components/layout/PublicHeader";
import CartIconWrapper from "@/components/cart/CartIconWrapper";

export const revalidate = 3600;

/* ─── Static Params ─── */

export async function generateStaticParams() {
  const supabase = await createAdminClient();
  const { data: products } = await supabase
    .from("products")
    .select("slug")
    .eq("status", "published");

  return (products || []).map((p) => ({ slug: p.slug }));
}

/* ─── Metadata ─── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("title, description, thumbnail")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!product) return { title: "Khoá học không tồn tại" };

  const title = `${product.title} — ${siteConfig.name}`;
  const description =
    product.description ?? `Khoá học ${product.title} từ ${siteConfig.owner.name}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: siteConfig.name,
      locale: "vi_VN",
      type: "website",
      images: product.thumbnail ? [product.thumbnail] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.thumbnail ? [product.thumbnail] : undefined,
    },
    alternates: {
      canonical: `${getBaseUrl()}/sales/${slug}`,
    },
  };
}

/* ─── Types ─── */

type Lesson = {
  id: string;
  title: string;
  duration_sec: number;
  is_free: boolean;
  sort_order: number;
};

type Chapter = {
  id: string;
  title: string;
  sort_order: number;
  lessons: Lesson[];
};

type SalesConfig = {
  painPoints?: { icon: string; title: string; description: string }[];
  benefits?: { icon: string; title: string; description: string }[];
  testimonials?: {
    name: string;
    role: string;
    text: string;
    avatar?: string;
  }[];
  faqs?: { question: string; answer: string }[];
  instructor?: { name: string; bio: string; avatar: string };
  guaranteeDays?: number;
} | null;

/* ─── Page ─── */

export default async function SalesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Auth check (optional — page works for both)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch product including sales_config
  const { data: product } = await supabase
    .from("products")
    .select(
      "id, slug, title, description, description_html, price, sale_price, thumbnail, sales_config"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!product) notFound();

  // Fetch chapters + lessons
  const { data: chaptersRaw } = await supabase
    .from("chapters")
    .select(
      `
      id, title, sort_order,
      lessons(id, title, duration_sec, is_free, sort_order)
    `
    )
    .eq("product_id", product.id)
    .order("sort_order");

  const chapters: Chapter[] = (chaptersRaw ?? []).map((ch) => ({
    id: ch.id,
    title: ch.title,
    sort_order: ch.sort_order,
    lessons: [...(ch.lessons as Lesson[])].sort(
      (a, b) => a.sort_order - b.sort_order
    ),
  }));

  // Parse sales config
  const salesConfig = product.sales_config as SalesConfig;

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <PublicHeader cartSlot={<CartIconWrapper />} />
      <SalesPageTemplate
        product={{
          id: product.id,
          slug: product.slug,
          title: product.title,
          description: product.description,
          description_html: product.description_html ?? null,
          price: product.price,
          sale_price: product.sale_price,
          thumbnail: product.thumbnail,
        }}
        chapters={chapters}
        isAuthenticated={!!user}
        painPoints={salesConfig?.painPoints}
        benefits={salesConfig?.benefits}
        testimonials={salesConfig?.testimonials}
        faqs={salesConfig?.faqs}
        instructor={salesConfig?.instructor}
        guaranteeDays={salesConfig?.guaranteeDays}
      />
    </div>
  );
}
