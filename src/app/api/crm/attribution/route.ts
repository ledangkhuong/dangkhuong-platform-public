import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// GET /api/crm/attribution — Marketing attribution data
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (
    !profile ||
    !["admin", "manager", "sale", "support", "marketing"].includes(
      profile.role
    )
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminClient = await createAdminClient();

  // Source breakdown: group by utm_source
  const { data: allContacts, error: contactsError } = await adminClient
    .from("crm_contacts")
    .select("utm_source, utm_campaign, journey_stage, lifetime_value")
    .not("utm_source", "is", null);

  if (contactsError)
    return NextResponse.json({ error: contactsError.message }, { status: 500 });

  // Build source breakdown
  const sourceMap: Record<
    string,
    { contacts: number; customers: number; revenue: number }
  > = {};

  for (const c of allContacts ?? []) {
    const src = c.utm_source || "unknown";
    if (!sourceMap[src]) {
      sourceMap[src] = { contacts: 0, customers: 0, revenue: 0 };
    }
    sourceMap[src].contacts++;
    if (c.journey_stage === "customer") {
      sourceMap[src].customers++;
    }
    sourceMap[src].revenue += c.lifetime_value || 0;
  }

  const sources = Object.entries(sourceMap).map(([source, stats]) => ({
    source,
    ...stats,
    conversion_rate:
      stats.contacts > 0
        ? Math.round((stats.customers / stats.contacts) * 10000) / 100
        : 0,
  }));

  // Campaign breakdown: group by utm_campaign
  const campaignContacts = (allContacts ?? []).filter((c) => c.utm_campaign);

  const campaignMap: Record<
    string,
    { utm_source: string | null; contacts: number; customers: number; revenue: number }
  > = {};

  for (const c of campaignContacts) {
    const campaign = c.utm_campaign!;
    if (!campaignMap[campaign]) {
      campaignMap[campaign] = {
        utm_source: c.utm_source,
        contacts: 0,
        customers: 0,
        revenue: 0,
      };
    }
    campaignMap[campaign].contacts++;
    if (c.journey_stage === "customer") {
      campaignMap[campaign].customers++;
    }
    campaignMap[campaign].revenue += c.lifetime_value || 0;
  }

  const campaigns = Object.entries(campaignMap).map(([campaign, stats]) => ({
    campaign,
    source: stats.utm_source,
    contacts: stats.contacts,
    customers: stats.customers,
    revenue: stats.revenue,
    conversion_rate:
      stats.contacts > 0
        ? Math.round((stats.customers / stats.contacts) * 10000) / 100
        : 0,
  }));

  return NextResponse.json({ sources, campaigns });
}
