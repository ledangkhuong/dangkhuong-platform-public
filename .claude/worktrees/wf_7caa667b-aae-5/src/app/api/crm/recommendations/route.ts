import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getViewerScope } from "@/lib/viewer-scope";

// GET /api/crm/recommendations — Get recommendations for a contact
export async function GET(req: NextRequest) {
  try {
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

    const { searchParams } = new URL(req.url);
    const contact_id = searchParams.get("contact_id");

    if (!contact_id) {
      return NextResponse.json(
        { error: "contact_id is required" },
        { status: 400 }
      );
    }

    // Sale-scoping: sale users can only view recommendations for their assigned contacts
    const scope = await getViewerScope();
    if (scope.isSale) {
      const { data: contactCheck } = await adminClient
        .from("crm_contacts")
        .select("assigned_to")
        .eq("id", contact_id)
        .single();
      if (contactCheck?.assigned_to !== scope.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data, error } = await adminClient
      .from("crm_course_recommendations")
      .select("*, products(title, price, thumbnail, description)")
      .eq("contact_id", contact_id)
      .order("score", { ascending: false });

    if (error) {
      console.error("[CRM Recommendations GET] Error:", error);
      return NextResponse.json({ error: "Có lỗi xảy ra khi tải gợi ý. Vui lòng thử lại." }, { status: 500 });
    }

    return NextResponse.json({ recommendations: data });
  } catch (err) {
    console.error("[CRM Recommendations GET] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/crm/recommendations — Auto-generate recommendations for a contact
export async function POST(req: NextRequest) {
  try {
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

    const { contact_id } = await req.json();

  if (!contact_id) {
    return NextResponse.json(
      { error: "contact_id is required" },
      { status: 400 }
    );
  }

  // Sale-scoping: sale users can only generate recommendations for their assigned contacts
  const scope = await getViewerScope();
  if (scope.isSale) {
    const { data: contactCheck } = await adminClient
      .from("crm_contacts")
      .select("assigned_to")
      .eq("id", contact_id)
      .single();
    if (contactCheck?.assigned_to !== scope.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Get contact email
  const { data: contact, error: contactError } = await adminClient
    .from("crm_contacts")
    .select("email")
    .eq("id", contact_id)
    .single();

  if (contactError || !contact)
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  // Get existing enrollments via orders
  const { data: orders } = await adminClient
    .from("orders")
    .select("product_id, amount")
    .eq("customer_email", contact.email)
    .eq("status", "paid");

  const enrolledProductIds = new Set(
    (orders ?? []).map((o) => o.product_id).filter(Boolean)
  );
  const purchasedAmounts = (orders ?? []).map((o) => o.amount).filter(Boolean);

  // Also check enrollments table
  const { data: enrollments } = await adminClient
    .from("enrollments")
    .select("product_id, profiles!inner(email)")
    .eq("profiles.email", contact.email);

  if (enrollments) {
    for (const e of enrollments) {
      enrolledProductIds.add(e.product_id);
    }
  }

  // Get all published products
  const { data: allProducts } = await adminClient
    .from("products")
    .select("id, title, price, thumbnail")
    .eq("status", "published");

  if (!allProducts || allProducts.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  // Filter out already-enrolled products
  const candidateProducts = allProducts.filter(
    (p) => !enrolledProductIds.has(p.id)
  );

  if (candidateProducts.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  // Get order counts for popularity scoring
  const { data: orderCounts } = await adminClient
    .from("orders")
    .select("product_id")
    .eq("status", "paid");

  const productOrderCount: Record<string, number> = {};
  if (orderCounts) {
    for (const o of orderCounts) {
      if (o.product_id) {
        productOrderCount[o.product_id] = (productOrderCount[o.product_id] || 0) + 1;
      }
    }
  }

  // Calculate scores
  const scored = candidateProducts.map((product) => {
    let score = 50; // Base score

    // If contact has purchased similar-priced courses: +20
    if (purchasedAmounts.length > 0 && product.price) {
      const avgPurchased =
        purchasedAmounts.reduce((a, b) => a + b, 0) / purchasedAmounts.length;
      const priceDiff = Math.abs(product.price - avgPurchased);
      if (priceDiff < avgPurchased * 0.5) {
        score += 20;
      }
    }

    // If product is a popular seller: +15
    const orderCount = productOrderCount[product.id] || 0;
    if (orderCount >= 5) {
      score += 15;
    }

    return { product_id: product.id, score };
  });

  // Sort by score descending and take top 3-5
  scored.sort((a, b) => b.score - a.score);
  const topRecommendations = scored.slice(0, 5);

  // Upsert recommendations (ON CONFLICT DO NOTHING via onConflict)
  const insertPayload = topRecommendations.map((rec) => ({
    contact_id,
    product_id: rec.product_id,
    score: rec.score,
    reason: rec.score >= 70 ? "similar_price_and_popular" : rec.score >= 65 ? "similar_price" : "recommended",
    recommended_by: user.id,
  }));

  const { error: insertError } = await adminClient
    .from("crm_course_recommendations")
    .upsert(insertPayload, { onConflict: "contact_id,product_id", ignoreDuplicates: true });

  if (insertError) {
    console.error("[CRM Recommendations POST] Error:", insertError);
    return NextResponse.json({ error: "Có lỗi xảy ra khi lưu gợi ý. Vui lòng thử lại." }, { status: 500 });
  }

  // Fetch the final recommendations
  const { data: recommendations } = await adminClient
    .from("crm_course_recommendations")
    .select("*, products(title, price, thumbnail, description)")
    .eq("contact_id", contact_id)
    .order("score", { ascending: false });

    return NextResponse.json({ recommendations: recommendations ?? [] });
  } catch (err) {
    console.error("[CRM Recommendations POST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
