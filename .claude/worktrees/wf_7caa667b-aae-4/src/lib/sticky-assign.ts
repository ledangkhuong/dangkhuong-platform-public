/**
 * Sticky sale assignment helper.
 *
 * Whenever a new order / course-interest / deal is created for a customer
 * who is already known in CRM (via `crm_contacts`), and that contact has an
 * `assigned_to` sale rep, the new row should inherit the same sale rep so a
 * customer always talks to the same person.
 *
 * Usage (server-side only — pass a Supabase admin client to bypass RLS):
 *
 *   const supabase = await createAdminClient();
 *   const stickySale = await getStickyAssignment(supabase, {
 *     email: "alice@example.com",
 *     user_id: user.id,
 *   });
 *   if (stickySale) {
 *     await supabase.from("orders").insert({ ..., assigned_to: stickySale });
 *   }
 *
 * Lookup order (first hit wins):
 *   1. by `contact_id`  (exact crm_contacts.id — authoritative, no fallthrough)
 *   2. by `user_id`     (most recent matching contact — authoritative if found)
 *   3. by `email`       (most recent matching contact — authoritative if found)
 *   4. orders fallback  (most recent assigned order — ONLY when no crm_contact
 *                        row exists at all; never overrides a contact's null)
 *
 * If a crm_contact row exists, its `assigned_to` is authoritative — even when
 * null. The orders fallback (step 4) only fires when NO contact record matches.
 *
 * When an `assigned_to` is found, the function validates that the referenced
 * profile still holds an assignable role (admin/manager/sale). If not, the
 * stale assignment is ignored and `null` is returned.
 *
 * Returns `null` when no matching contact exists, the matched contact has
 * no `assigned_to`, or the assigned user is no longer valid. Errors are logged
 * and treated as "no sticky" (returns null) — callers should still proceed
 * with the insert.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Roles that are valid for a sale assignment target. */
const VALID_ASSIGNED_ROLES = ["admin", "manager", "sale"];

export type StickyAssignOpts = {
  contact_id?: string | null;
  user_id?: string | null;
  email?: string | null;
};

/**
 * Look up the sticky `assigned_to` (sale rep) for a known customer.
 *
 * @param supabase - Supabase client — typically `createAdminClient()` so the
 *                   lookup is not blocked by RLS on `crm_contacts`.
 * @param opts     - At least one of `contact_id`, `user_id`, or `email` must
 *                   be provided.
 * @returns The `assigned_to` UUID string of the matching contact, or `null`
 *          if no match / no assignment / on error.
 */
export async function getStickyAssignment(
  supabase: SupabaseClient,
  opts: StickyAssignOpts
): Promise<string | null> {
  const contactId = opts.contact_id?.trim() || null;
  const userId = opts.user_id?.trim() || null;
  const email = opts.email?.trim().toLowerCase() || null;

  if (!contactId && !userId && !email) {
    return null;
  }

  try {
    // Track whether ANY crm_contact row was found — when a contact exists,
    // its assigned_to is authoritative (even null) and we must NOT fall
    // through to the orders-based fallback.
    let contactFound = false;

    // 1) Direct contact_id lookup — most specific & authoritative.
    //    If the row exists, return whatever assigned_to it has (incl. null).
    //    No fallthrough — caller asked about THIS contact.
    if (contactId) {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("assigned_to")
        .eq("id", contactId)
        .maybeSingle();

      if (error) {
        console.error("[stickyAssign] contact_id lookup error:", error.message);
        return null;
      }
      const raw = (data?.assigned_to as string | null) ?? null;
      return raw ? await validateAssignee(supabase, raw) : null;
    }

    // 2) user_id lookup — most recent matching contact wins.
    //    Fall through to email ONLY if no row found (user_id may not be set on
    //    contacts created from old orders / manual import).
    //    If a contact IS found, its assigned_to is authoritative — do NOT fall
    //    through to orders even when null.
    if (userId) {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("assigned_to")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("[stickyAssign] user_id lookup error:", error.message);
        // don't fall through on DB errors
        return null;
      }
      const row = data?.[0];
      if (row) {
        contactFound = true;
        if (row.assigned_to) {
          return await validateAssignee(supabase, row.assigned_to as string);
        }
        // Contact exists but unassigned — authoritative null. Do NOT fall
        // through to orders (that would let an old order override the
        // contact's authoritative state).
      }
      // No row by user_id — fall through to email lookup.
    }

    // 3) email lookup on crm_contacts — most recent matching contact wins.
    if (!contactFound && email) {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("assigned_to")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("[stickyAssign] email lookup error:", error.message);
        return null;
      }
      const row = data?.[0];
      if (row) {
        contactFound = true;
        if (row.assigned_to) {
          return await validateAssignee(supabase, row.assigned_to as string);
        }
        // Contact exists but unassigned — authoritative null.
      }
    }

    // 4) Fallback: most recent prior ORDER from the same customer that has an
    //    `assigned_to`. ONLY when no crm_contact row exists at all — if a
    //    contact was found above (even with null assigned_to), its state is
    //    authoritative and we respect it.
    if (!contactFound && (email || userId)) {
      let query = supabase
        .from("orders")
        .select("assigned_to")
        .not("assigned_to", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (email && userId) {
        // Either side matches — wider net. Use .eq for exact match (email is
        // already lowercased above; customer_email is stored lowercase).
        query = query.or(
          `customer_email.eq.${email},user_id.eq.${userId}`
        );
      } else if (email) {
        query = query.eq("customer_email", email);
      } else {
        query = query.eq("user_id", userId!);
      }

      const { data, error } = await query;
      if (error) {
        console.error("[stickyAssign] orders fallback error:", error.message);
        return null;
      }
      const row = data?.[0];
      const raw = (row?.assigned_to as string | null) ?? null;
      return raw ? await validateAssignee(supabase, raw) : null;
    }

    return null;
  } catch (err) {
    console.error(
      "[stickyAssign] unexpected error:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Validate that a sale rep's profile still has an assignable role.
 * Returns the UUID if valid, `null` if the profile no longer exists or
 * has been moved to a non-assignable role (e.g. 'user').
 */
async function validateAssignee(
  supabase: SupabaseClient,
  assigneeId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", assigneeId)
      .maybeSingle();

    if (error) {
      console.error("[stickyAssign] assignee validation error:", error.message);
      // On error, be conservative: return the id anyway so the assignment
      // isn't silently dropped due to a transient DB issue.
      return assigneeId;
    }

    if (!data) {
      // Profile deleted — FK ON DELETE SET NULL should have cleared this,
      // but if we got here via orders fallback the FK may not apply.
      console.warn(
        `[stickyAssign] assignee ${assigneeId} profile not found — skipping`
      );
      return null;
    }

    if (!VALID_ASSIGNED_ROLES.includes(data.role as string)) {
      console.warn(
        `[stickyAssign] assignee ${assigneeId} has role '${data.role}' — no longer assignable, skipping`
      );
      return null;
    }

    return assigneeId;
  } catch {
    // Fail-open on unexpected errors to avoid silently dropping assignments.
    return assigneeId;
  }
}

/**
 * First-touch propagation options.
 */
export type PropagateToContactOpts = {
  contact_id?: string | null;
  user_id?: string | null;
  email?: string | null;
  sale_id: string | null;
};

/**
 * Result of a `propagateToContact` call.
 */
export type PropagateToContactResult =
  | { propagated: true; contact_id: string }
  | {
      propagated: false;
      reason: "unassign-skip" | "no-identifier" | "no-contact" | "already-assigned" | "error";
      contact_id?: string;
    };

/**
 * First-touch propagation — when admin assigns a sale to an order or course
 * interest, copy that assignment "up" to the matching `crm_contacts` row so
 * future items inherit the same sticky owner via `getStickyAssignment`.
 *
 * This is the OPPOSITE direction from `getStickyAssignment`:
 *   - `getStickyAssignment`: contact → new item (reads down).
 *   - `propagateToContact`:  item    → contact (writes up).
 *
 * Safety rules:
 *   - If `sale_id` is `null` (admin unassigning), return `unassign-skip` —
 *     never clear or change the contact's owner.
 *   - If the matched contact ALREADY has `assigned_to`, return
 *     `already-assigned` — NEVER overwrite an existing owner.
 *   - If no matching contact exists, return `no-contact` — do NOT create one;
 *     contact creation is the sync job's responsibility.
 *   - Lookup priority: `contact_id` → `user_id` → `email`.
 *   - Fail-soft on errors: log and return `{ propagated: false, reason: "error" }`.
 *
 * @param supabase - Supabase client — typically `createAdminClient()` so the
 *                   write is not blocked by RLS on `crm_contacts`.
 * @param opts     - Customer identifier(s) + the sale rep id to propagate.
 */
export async function propagateToContact(
  supabase: SupabaseClient,
  opts: PropagateToContactOpts
): Promise<PropagateToContactResult> {
  // Never touch the contact when admin is unassigning.
  if (opts.sale_id === null || opts.sale_id === undefined) {
    return { propagated: false, reason: "unassign-skip" };
  }

  const saleId = opts.sale_id.trim();
  if (!saleId) {
    return { propagated: false, reason: "unassign-skip" };
  }

  // Validate that the sale rep is still in an assignable role before
  // propagating — don't stamp a stale assignment onto the contact.
  const validatedSaleId = await validateAssignee(supabase, saleId);
  if (!validatedSaleId) {
    console.warn(
      `[propagateToContact] sale_id ${saleId} is no longer a valid assignee — skipping propagation`
    );
    return { propagated: false, reason: "error" };
  }

  const contactId = opts.contact_id?.trim() || null;
  const userId = opts.user_id?.trim() || null;
  const email = opts.email?.trim().toLowerCase() || null;

  if (!contactId && !userId && !email) {
    return { propagated: false, reason: "no-identifier" };
  }

  try {
    // Find the matching contact row (priority: contact_id → user_id → email).
    let matched: { id: string; assigned_to: string | null; user_id: string | null } | null = null;

    // 1) contact_id is authoritative — no fallthrough.
    if (contactId) {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("id, assigned_to, user_id")
        .eq("id", contactId)
        .maybeSingle();
      if (error) {
        console.error(
          "[propagateToContact] contact_id lookup error:",
          error.message
        );
        return { propagated: false, reason: "error" };
      }
      matched = (data as { id: string; assigned_to: string | null; user_id: string | null } | null) ?? null;
    }

    // 2) user_id lookup — fall through to email if no row.
    if (!matched && userId) {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("id, assigned_to, user_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) {
        console.error(
          "[propagateToContact] user_id lookup error:",
          error.message
        );
        return { propagated: false, reason: "error" };
      }
      const row = data?.[0] as
        | { id: string; assigned_to: string | null; user_id: string | null }
        | undefined;
      matched = row ?? null;
    }

    // 3) email lookup — last resort.
    if (!matched && email) {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("id, assigned_to, user_id, created_at")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) {
        console.error(
          "[propagateToContact] email lookup error:",
          error.message
        );
        return { propagated: false, reason: "error" };
      }
      const row = data?.[0] as
        | { id: string; assigned_to: string | null; user_id: string | null }
        | undefined;
      matched = row ?? null;
    }

    if (!matched) {
      return { propagated: false, reason: "no-contact" };
    }

    // NEVER overwrite an existing owner.
    if (matched.assigned_to) {
      return {
        propagated: false,
        reason: "already-assigned",
        contact_id: matched.id,
      };
    }

    const { error: updErr } = await supabase
      .from("crm_contacts")
      .update({ assigned_to: validatedSaleId })
      .eq("id", matched.id)
      .is("assigned_to", null); // extra guard against race: only write if still null

    if (updErr) {
      console.error("[propagateToContact] update error:", updErr.message);
      return { propagated: false, reason: "error" };
    }

    // Sync account_manager_id on the linked user's profile (first-touch only).
    // Fail-soft — never block the propagation result.
    if (matched.user_id) {
      try {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ account_manager_id: validatedSaleId })
          .eq("id", matched.user_id)
          .is("account_manager_id", null); // first-touch: never overwrite

        if (profileErr) {
          console.error(
            "[propagateToContact] profile account_manager_id sync error:",
            profileErr.message
          );
        }
      } catch (profileSyncErr) {
        console.error(
          "[propagateToContact] profile account_manager_id sync unexpected error:",
          profileSyncErr instanceof Error
            ? profileSyncErr.message
            : profileSyncErr
        );
      }
    }

    return { propagated: true, contact_id: matched.id };
  } catch (err) {
    console.error(
      "[propagateToContact] unexpected error:",
      err instanceof Error ? err.message : err
    );
    return { propagated: false, reason: "error" };
  }
}
