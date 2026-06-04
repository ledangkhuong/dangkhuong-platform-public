export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/server";
import { getLandingPageById } from "@/lib/landing-pages";
import { listPixelConfigs } from "@/lib/pixel-config";
import LandingPixelEditor from "@/components/admin/LandingPixelEditor";
import DeleteLandingButton from "@/components/admin/DeleteLandingButton";

export default async function AdminLandingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager", "marketing"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Load landing + attached pixels + all pixels available
  const [landing, allPixels] = await Promise.all([
    getLandingPageById(id),
    listPixelConfigs(),
  ]);

  if (!landing) notFound();

  return (
    <div>
      <TopBar
        title={landing.name}
        subtitle={`Gắn Pixel cho ${landing.pathname}`}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Back nav */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/pixel-settings/pages"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Tất cả landing
          </Link>
          <div className="flex items-center gap-2">
            <a
              href={landing.pathname}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-gray-300 hover:text-white transition-colors"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <ExternalLink size={11} /> Mở trang
            </a>
            <DeleteLandingButton
              landingId={landing.id}
              pathname={landing.pathname}
              redirectAfter="/admin/pixel-settings/pages"
            />
          </div>
        </div>

        {/* Editor — landing info + pixel picker + save bar */}
        <LandingPixelEditor
          landing={landing}
          attached={landing.pixels}
          allPixels={allPixels}
        />
      </div>
    </div>
  );
}
