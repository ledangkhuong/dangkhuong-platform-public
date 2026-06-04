/**
 * Zalo OA Integration
 *
 * ENV vars required:
 *   ZALO_OA_ACCESS_TOKEN  - OA access token (from Zalo OA Dashboard)
 *   ZALO_OA_APP_ID        - Zalo app ID
 *   ZALO_OA_SECRET_KEY    - Zalo app secret key
 *   ZALO_OA_REFRESH_TOKEN - For token refresh
 *
 * Docs: https://developers.zalo.me/docs/official-account
 */

const ZALO_API_BASE = "https://openapi.zalo.me/v3.0/oa";

interface ZaloMessageResult {
  success: boolean;
  error?: string;
  message_id?: string;
}

// Get access token (with auto-refresh logic)
async function getAccessToken(): Promise<string | null> {
  return process.env.ZALO_OA_ACCESS_TOKEN || null;
}

// Send text message to a Zalo user (who follows the OA)
export async function sendZaloMessage(
  zaloUserId: string,
  text: string
): Promise<ZaloMessageResult> {
  const token = await getAccessToken();
  if (!token) return { success: false, error: "ZALO_OA_ACCESS_TOKEN not configured" };

  try {
    const res = await fetch(`${ZALO_API_BASE}/message/cs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: token,
      },
      body: JSON.stringify({
        recipient: { user_id: zaloUserId },
        message: { text },
      }),
    });
    const data = await res.json();
    if (data.error === 0) {
      return { success: true, message_id: data.data?.message_id };
    }
    return { success: false, error: data.message || `Zalo error ${data.error}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// Send purchase confirmation
export async function sendPurchaseNotification(
  zaloUserId: string,
  customerName: string,
  productName: string,
  amount: number,
  orderCode: string
): Promise<ZaloMessageResult> {
  const text = `Xac nhan thanh toan thanh cong!

Xin chao ${customerName},

Don hang cua ban da duoc xac nhan:
San pham: ${productName}
So tien: ${amount.toLocaleString("vi-VN")}d
Ma don: ${orderCode}

Quyen truy cap da duoc kich hoat. Hay dang nhap de bat dau hoc ngay!

Cam on ban da tin tuong!`;

  return sendZaloMessage(zaloUserId, text);
}

// Send welcome notification (after registration)
export async function sendWelcomeNotification(
  zaloUserId: string,
  name: string
): Promise<ZaloMessageResult> {
  const text = `Chao mung ${name} den voi nen tang!

Tai khoan cua ban da duoc tao thanh cong. Hay kham pha cac khoa hoc va bat dau hanh trinh hoc tap ngay nhe!

Meo: Theo doi OA de nhan thong bao khi co khoa hoc moi hoac khuyen mai dac biet.`;

  return sendZaloMessage(zaloUserId, text);
}

// Send new lesson notification
export async function sendNewLessonNotification(
  zaloUserId: string,
  courseName: string,
  lessonName: string
): Promise<ZaloMessageResult> {
  const text = `Bai hoc moi!

Khoa hoc "${courseName}" vua cap nhat bai hoc moi:
${lessonName}

Dang nhap ngay de hoc bai moi nhe!`;

  return sendZaloMessage(zaloUserId, text);
}

// Send study reminder
export async function sendStudyReminder(
  zaloUserId: string,
  name: string,
  courseName: string,
  progressPercent: number
): Promise<ZaloMessageResult> {
  const text = `Nhac nho hoc tap

Xin chao ${name},

Ban da hoan thanh ${progressPercent}% khoa hoc "${courseName}". Hay danh chut thoi gian de tiep tuc hoc nhe!

Kien tri la chia khoa thanh cong!`;

  return sendZaloMessage(zaloUserId, text);
}

// Check if Zalo OA is configured
export function isZaloOAConfigured(): boolean {
  return !!process.env.ZALO_OA_ACCESS_TOKEN;
}
