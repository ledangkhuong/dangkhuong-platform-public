import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST /api/email/subscribers/import — bulk import subscribers from CSV
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const text = await file.text();
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
    const admin = await createAdminClient();

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
      const { data: upserted, error: upsertError } = await admin
        .from("subscribers")
        .upsert(subscribersToUpsert, {
          onConflict: "email",
          ignoreDuplicates: false,
        })
        .select("id");

      if (upsertError) {
        errors.push(
          `Batch starting at row ${i + 2}: ${upsertError.message}`
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
        const { error: listError } = await admin
          .from("subscriber_list_members")
          .upsert(listMembers, {
            onConflict: "subscriber_id,list_id",
            ignoreDuplicates: true,
          });

        if (listError) {
          errors.push(`Error adding batch to list: ${listError.message}`);
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
