/**
 * PayOS Payment Gateway Client Library
 *
 * PayOS hỗ trợ thanh toán qua MoMo, ZaloPay, và ngân hàng thông qua API thống nhất.
 * Docs: https://payos.vn/docs
 *
 * Env vars required:
 *   PAYOS_CLIENT_ID=...
 *   PAYOS_API_KEY=...
 *   PAYOS_CHECKSUM_KEY=...
 *
 * PREREQUISITE: Add payos_order_code column to orders table in Supabase SQL Editor:
 *
 * ALTER TABLE orders ADD COLUMN IF NOT EXISTS payos_order_code BIGINT;
 * CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payos_order_code
 *   ON orders(payos_order_code) WHERE payos_order_code IS NOT NULL;
 */

import crypto from "crypto";

const PAYOS_BASE_URL = "https://api-merchant.payos.vn";

// ─── Configuration check ────────────────────────────────────────────────────

export function isPayOSConfigured(): boolean {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  return !!(
    clientId &&
    apiKey &&
    checksumKey &&
    !clientId.includes("your-") &&
    !apiKey.includes("your-") &&
    !checksumKey.includes("your-")
  );
}

// ─── HMAC checksum generation ───────────────────────────────────────────────

/**
 * Generate HMAC SHA256 checksum for PayOS API requests.
 *
 * PayOS requires the data string to be sorted alphabetically by key,
 * in the format: key1=value1&key2=value2&...
 */
export function generateChecksum(data: Record<string, string | number>): string {
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!checksumKey) throw new Error("PAYOS_CHECKSUM_KEY is not configured");

  const sortedKeys = Object.keys(data).sort();
  const dataString = sortedKeys.map((key) => `${key}=${data[key]}`).join("&");

  return crypto
    .createHmac("sha256", checksumKey)
    .update(dataString)
    .digest("hex");
}

// ─── Webhook signature verification ─────────────────────────────────────────

/**
 * Verify PayOS webhook signature.
 *
 * The webhook payload `data` object fields are sorted alphabetically,
 * concatenated as key=value&key=value, then HMAC SHA256'd with PAYOS_CHECKSUM_KEY.
 */
export function verifyWebhookSignature(
  data: Record<string, unknown>,
  signature: string
): boolean {
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  if (!checksumKey) return false;

  // Sort keys and build data string — only include primitive values
  const sortedKeys = Object.keys(data).sort();
  const dataString = sortedKeys
    .map((key) => `${key}=${data[key]}`)
    .join("&");

  const expectedSignature = crypto
    .createHmac("sha256", checksumKey)
    .update(dataString)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

// ─── Generate unique PayOS order code ───────────────────────────────────────

/**
 * Generate a unique positive integer for PayOS orderCode.
 *
 * PayOS requires orderCode to be a positive integer (max 2^53 - 1 for JS safety).
 * We use timestamp-based generation with a random suffix to avoid collisions.
 *
 * Format: last 9 digits of timestamp + 4 random digits = 13 digits max
 * This fits well within JS safe integer range and PayOS limits.
 */
export function generatePayOSOrderCode(): number {
  const timestamp = Date.now() % 1_000_000_000; // last 9 digits
  const random = Math.floor(Math.random() * 10000); // 4 random digits
  return timestamp * 10000 + random;
}

// ─── Create PayOS payment link ──────────────────────────────────────────────

interface CreatePaymentLinkParams {
  orderCode: number;
  amount: number;
  description: string;
  cancelUrl: string;
  returnUrl: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface PayOSPaymentLinkResponse {
  code: string;
  desc: string;
  data: {
    bin: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    description: string;
    orderCode: number;
    currency: string;
    paymentLinkId: string;
    status: string;
    checkoutUrl: string;
    qrCode: string;
  };
  signature: string;
}

export async function createPaymentLink(
  params: CreatePaymentLinkParams
): Promise<PayOSPaymentLinkResponse> {
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;

  if (!clientId || !apiKey) {
    throw new Error("PayOS is not configured");
  }

  // Generate checksum from required fields
  const checksumData: Record<string, string | number> = {
    amount: params.amount,
    cancelUrl: params.cancelUrl,
    description: params.description,
    orderCode: params.orderCode,
    returnUrl: params.returnUrl,
  };
  const signature = generateChecksum(checksumData);

  const body = {
    orderCode: params.orderCode,
    amount: params.amount,
    description: params.description,
    cancelUrl: params.cancelUrl,
    returnUrl: params.returnUrl,
    signature,
    ...(params.items ? { items: params.items } : {}),
  };

  const response = await fetch(`${PAYOS_BASE_URL}/v2/payment-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": clientId,
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[PayOS] API error:", response.status, errorText);
    throw new Error(`PayOS API error: ${response.status}`);
  }

  const result: PayOSPaymentLinkResponse = await response.json();

  if (result.code !== "00") {
    console.error("[PayOS] Payment link creation failed:", result);
    throw new Error(`PayOS error: ${result.desc || result.code}`);
  }

  return result;
}
