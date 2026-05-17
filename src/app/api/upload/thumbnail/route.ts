import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const BUCKET = "thumbnails";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];

/** Sanitize filename: remove path traversal, special chars, keep only safe characters */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .substring(0, 100);
}

/** Validate actual file content via magic bytes, not just declared MIME type */
function validateImageMagicBytes(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 4));
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return true;
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38)
    return true;
  // WebP: 52 49 46 46 (RIFF header)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46)
    return true;
  return false;
}

export async function POST(req: NextRequest) {
  // Auth check — admin only
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

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse file from FormData
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate MIME type (whitelist)
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Only JPEG, PNG, GIF, WebP allowed." },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 5MB." },
      { status: 400 }
    );
  }

  // Validate file extension
  const rawExt = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.includes(rawExt)) {
    return NextResponse.json(
      { error: "Invalid file extension." },
      { status: 400 }
    );
  }

  // Read file content and validate magic bytes (actual content, not just MIME)
  const arrayBuffer = await file.arrayBuffer();
  if (!validateImageMagicBytes(arrayBuffer)) {
    return NextResponse.json(
      { error: "File content does not match a valid image format." },
      { status: 400 }
    );
  }

  const admin = await createAdminClient();

  // Ensure bucket exists (idempotent)
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_SIZE,
      allowedMimeTypes: ALLOWED_TYPES,
    });
  }

  // Generate unique filename with sanitized extension
  const ext = sanitizeFilename(rawExt) || "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Thumbnail upload failed:", uploadError.message);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(filename);

  return NextResponse.json({ url: publicUrl });
}
