/**
 * Viewer-scope helper.
 *
 * Pages that show assignable data (orders, contacts, interests, deals,
 * users) should restrict what a logged-in sale rep sees to ONLY their
 * own assignments. Admin and manager keep full visibility.
 *
 * Usage (server component / route):
 *
 *   const scope = await getViewerScope();
 *   if (!scope.canView) redirect("/dashboard");
 *
 *   let query = supabase.from("orders").select("*", { count: "exact" });
 *   if (scope.isSale) query = query.eq("assigned_to", scope.userId);
 *
 * Returned shape:
 *   - canView:      did we resolve a logged-in profile with a role that
 *                   should be in admin/CRM pages? (admin, manager, sale)
 *                   When false, caller should redirect/404.
 *   - isSale:       true ONLY when role === 'sale'. Pages use this to
 *                   decide whether to scope queries to the user's id.
 *   - canMutate:    true for admin/manager — they can change assignments
 *                   or edit data. Sale should be read-only.
 *   - role:         exact role string (or null if not signed in).
 *   - userId:       profile id of the viewer (or null).
 *
 * This helper purposely uses the user-context Supabase client (cookies)
 * to read the role — never the admin client. The actual data queries on
 * each page may still use createAdminClient (to bypass RLS); the SCOPE
 * decision is made here from the trusted session.
 */
import { createClient } from "@/lib/supabase/server";

export type ViewerScope = {
  canView: boolean;
  isSale: boolean;
  canMutate: boolean;
  role: string | null;
  userId: string | null;
};

export async function getViewerScope(): Promise<ViewerScope> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      canView: false,
      isSale: false,
      canMutate: false,
      role: null,
      userId: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as string | null) ?? null;
  const isAdminOrManager = role === "admin" || role === "manager";
  const isSale = role === "sale";
  const canView = isAdminOrManager || isSale;

  return {
    canView,
    isSale,
    canMutate: isAdminOrManager,
    role,
    userId: user.id,
  };
}
