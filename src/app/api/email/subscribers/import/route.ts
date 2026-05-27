import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/email/subscribers/import — bulk import subscribers from CSV
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Role check
    const adminClient = await createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "manager"].includes(profile.role))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Rate limit: 3 imports per 5 min per user
    const rl = await rateLimit(`import:${user.id}`, 3, 300);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const listId = formData.get("list_id") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 400 }
      );
    }

    const MAX_CSV_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_CSV_SIZE) {
      return NextResponse.json(
        { error: "File quá lớn (tối đa 10MB)" },
        { status: 400 }
      );
    }

    // Read file content and validate it is text, not binary data
    const arrayBuffer = await file.arrayBuffer();
    const firstBytes = new Uint8Array(arrayBuffer.slice(0, 8));

    // Reject files that start with common binary magic bytes (images, archives, executables, etc.)
    const binarySignatures: Array<{ name: string; bytes: number[] }> = [
      { name: "PNG",  bytes: [0x89, 0x50, 0x4e, 0x47] },
      { name: "JPEG", bytes: [0xff, 0xd8, 0xff] },
      { name: "GIF",  bytes: [0x47, 0x49, 0x46] },
      { name: "PDF",  bytes: [0x25, 0x50, 0x44, 0x46] },
      { name: "ZIP",  bytes: [0x50, 0x4b, 0x03, 0x04] },
      { name: "GZIP", bytes: [0x1f, 0x8b] },
      { name: "EXE",  bytes: [0x4d, 0x5a] },
      { name: "RIFF", bytes: [0x52, 0x49, 0x46, 0x46] },
      { name: "ELF",  bytes: [0x7f, 0x45, 0x4c, 0x46] },
    ];

    for (const sig of binarySignatures) {
      if (sig.bytes.every((b, i) => firstBytes[i] === b)) {
        return NextResponse.json(
          { error: `File appears to be binary (${sig.name}), not CSV text` },
          { status: 400 }
        );
      }
    }

    // Check for null bytes in the first 1KB, which indicate binary content
    const sampleBytes = new Uint8Array(arrayBuffer.slice(0, 1024));
    if (sampleBytes.includes(0x00)) {
      return NextResponse.json(
        { error: "File contains null bytes and appears to be binary, not CSV text" },
        { status: 400 }
      );
    }

    const text = new TextDecoder().decode(arrayBuffer);
    const lines = text.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must have a header row and at least one data row" },
        { status: 400 }
      );
    }

    // Parse header
    const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    const emailIdx = header.indexOf("email");

    if (emailIdx === -1) {
      return NextResponse.json(
        { error: "CSV must have an 'email' column" },
        { status: 400 }
      );
    }

    const fullNameIdx = header.indexOf("full_name");
    const phoneIdx = header.indexOf("phone");
    const tagsIdx = header.indexOf("tags");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    // Process rows in batches of 100
    const rows = lines.slice(1);
    const batchSize = 100;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const subscribersToUpsert: Record<string, unknown>[] = [];

      for (let j = 0; j < batch.length; j++) {
        const rowNum = i + j + 2; // 1-indexed, +1 for header
        const values = parseCSVLine(batch[j]);

        const email = values[emailIdx]?.trim().toLowerCase();
        if (!email) {
          errors.push(`Row ${rowNum}: missing email`);
          skipped++;
          continue;
        }

        if (!emailRegex.test(email)) {
          errors.push(`Row ${rowNum}: invalid email '${email}'`);
          skipped++;
          continue;
        }

        const subscriberData: Record<string, unknown> = {
          email,
          source: "import",
          subscribed_at: new Date().toISOString(),
        };

        if (fullNameIdx !== -1 && values[fullNameIdx]?.trim()) {
          subscriberData.full_name = values[fullNameIdx].trim();
        }
        if (phoneIdx !== -1 && values[phoneIdx]?.trim()) {
          subscriberData.phone = values[phoneIdx].trim();
        }
        if (tagsIdx !== -1 && values[tagsIdx]?.trim()) {
          // Tags can be semicolon-separated within the CSV field
          subscriberData.tags = values[tagsIdx]
            .split(";")
            .map((t: string) => t.trim())
            .filter(Boolean);
        }

        subscribersToUpsert.push(subscriberData);
      }

      if (subscribersToUpsert.length === 0) continue;

      // Upsert: on conflict (email), update full_name and phone if provided
      const { data: upserted, error: upsertError } = await adminClient
        .from("subscribers")
        .upsert(subscribersToUpsert, {
          onConflict: "email",
          ignoreDuplicates: false,
        })
        .select("id");

      if (upsertError) {
        console.error("Import upsert error:", upsertError.message);
        errors.push(
          `Batch starting at row ${i + 2}: import failed`
        );
        skipped += subscribersToUpsert.length;
        continue;
      }

      imported += upserted?.length || 0;

      // Add to list if provided
      if (listId && upserted && upserted.length > 0) {
        const listMembers = upserted.map(
          (s: { id: string }) => ({
            subscriber_id: s.id,
            list_id: listId,
            added_at: new Date().toISOString(),
          })
        );

        // Use upsert to avoid duplicate key errors
        const { error: listError } = await adminClient
          .from("subscriber_list_members")
          .upsert(listMembers, {
            onConflict: "subscriber_id,list_id",
            ignoreDuplicates: true,
          });

        if (listError) {
          console.error("Import list assignment error:", listError.message);
          errors.push(`Error adding batch to list`);
        }
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      errors: errors.slice(0, 50), // Cap error messages
    });
  } catch (err) {
    console.error("POST /api/email/subscribers/import error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Parse a single CSV line, handling quoted fields with commas/newlines.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
