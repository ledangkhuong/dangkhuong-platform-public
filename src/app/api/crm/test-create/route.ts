import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  const steps: string[] = [];
  try {
    steps.push("start");

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    steps.push("adminClient_created");

    const contactPayload = {
      full_name: "Test API Route Debug",
      email: null,
      phone: null,
      company: null,
      source: null,
      status: "new",
      tags: [],
      notes: null,
      assigned_to: null,
      facebook_url: null,
      created_by: null,
    };
    steps.push("payload_ready");

    const { data, error } = await admin
      .from("crm_contacts")
      .insert(contactPayload)
      .select("id")
      .single();
    steps.push("insert_done");

    if (error) {
      return NextResponse.json({
        ok: false,
        steps,
        error: { message: error.message, code: error.code, details: error.details, hint: error.hint },
      });
    }

    return NextResponse.json({ ok: true, steps, data });
  } catch (err) {
    steps.push("exception");
    return NextResponse.json({
      ok: false,
      steps,
      exception: err instanceof Error ? err.message : String(err),
    });
  }
}
