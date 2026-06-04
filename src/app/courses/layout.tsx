import { createClient } from "@/lib/supabase/server";
import CoursesLayoutShell from "./CoursesLayoutShell";
import PublicHeader from "@/components/layout/PublicHeader";
import CartIconWrapper from "@/components/cart/CartIconWrapper";

export default async function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* ── Authenticated → dashboard shell with sidebar ── */
  if (user) {
    return <CoursesLayoutShell>{children}</CoursesLayoutShell>;
  }

  /* ── Public → lightweight header ── */
  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <PublicHeader cartSlot={<CartIconWrapper />} />
      <main>{children}</main>
    </div>
  );
}
