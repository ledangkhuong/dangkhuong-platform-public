import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

const BUCKET = "lesson-attachments";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_EXTENSIONS = ["pdf", "docx", "xlsx", "pptx", "zip"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
];

// Magic bytes for each supported file type
const MAGIC_BYTES: { ext: string; check: (bytes: Uint8Array) => boolean }[] = [
  {
    // PDF: %PDF
    ext: "pdf",
    check: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  },
  {
    // DOCX/XLSX/PPTX/ZIP all use PK (ZIP container): 50 4B 03 04
    ext: "zip",
    check: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04,
  },
];

function validateMagicBytes(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 8));
  return MAGIC_BYTES.some((m) => m.check(bytes));
}

/** Sanitize filename: remove path traversal, special chars, keep only safe characters */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .substring(0, 100);
}

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Role check: admin or manager
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "manager", "editor"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit: 20 uploads per hour per IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(`lesson-attachment:${ip}`, 20, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec || 60) },
      }
    );
  }

  // Parse file from FormData
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate file size
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 10MB." },
      { status: 400 }
    );
  }

  // Validate file extension
  const rawExt = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.includes(rawExt)) {
    return NextResponse.json(
      {
        error:
          "Invalid file type. Only PDF, DOCX, XLSX, PPTX, ZIP are allowed.",
      },
      { status: 400 }
    );
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error:
          "Invalid file type. Only PDF, DOCX, XLSX, PPTX, ZIP are allowed.",
      },
      { status: 400 }
    );
  }

  // Read file content and validate magic bytes
  const arrayBuffer = await file.arrayBuffer();
  if (!validateMagicBytes(arrayBuffer)) {
    return NextResponse.json(
      { error: "File content does not match a valid document format." },
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
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
  }

  // Generate unique filename
  const ext = sanitizeFilename(rawExt);
  const randomSuffix = crypto.randomBytes(6).toString("hex");
  const filename = `${Date.now()}-${randomSuffix}.${ext}`;
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Lesson attachment upload failed:", uploadError.message);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(filename);

  return NextResponse.json({
    url: publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  });
}
