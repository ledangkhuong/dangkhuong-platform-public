import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

const BUCKET = "community-images";
const MAX_SIZE = 4 * 1024 * 1024; // 4MB (Vercel Hobby has 4.5MB body limit)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
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
  const bytes = new Uint8Array(buffer.slice(0, 12));
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return true;
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38)
    return true;
  // WebP: bytes 0-3 must be "RIFF" AND bytes 8-11 must be "WEBP"
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  )
    return true;
  return false;
}

export async function POST(req: NextRequest) {
  // Auth: any authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 10 uploads per hour per user
  const rl = await rateLimit(`community-img:${user.id}`, 10, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Quá nhiều ảnh được tải lên. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec || 60) } }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate MIME type (whitelist)
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Loại file không hợp lệ. Chỉ chấp nhận JPEG, PNG, GIF, WebP." },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File quá lớn. Tối đa 4MB." },
      { status: 400 }
    );
  }

  // Validate file extension
  const rawExt = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.includes(rawExt)) {
    return NextResponse.json(
      { error: "Phần mở rộng file không hợp lệ." },
      { status: 400 }
    );
  }

  // Read file content and validate magic bytes (actual content, not just MIME)
  const arrayBuffer = await file.arrayBuffer();
  if (!validateImageMagicBytes(arrayBuffer)) {
    return NextResponse.json(
      { error: "Nội dung file không phải là ảnh hợp lệ." },
      { status: 400 }
    );
  }

  const admin = await createAdminClient();

  // Generate unique filename
  const ext = sanitizeFilename(rawExt) || "jpg";
  const randomSuffix = crypto.randomBytes(6).toString("hex");
  const filename = `${user.id}/${Date.now()}-${randomSuffix}.${ext}`;
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Community image upload failed:", uploadError.message);
    return NextResponse.json(
      { error: "Tải ảnh lên thất bại. Vui lòng thử lại." },
      { status: 500 }
    );
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(filename);
  return NextResponse.json({ url: publicUrl });
}
