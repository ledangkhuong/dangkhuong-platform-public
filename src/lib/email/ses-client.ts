/**
 * AWS SES Client Singleton
 * Dedicated singleton module for SESv2Client — import this from send-engine
 * and campaign-processor instead of duplicating client creation.
 */

import { SESv2Client } from "@aws-sdk/client-sesv2";

let client: SESv2Client | null = null;

/**
 * Get (or create) a singleton SESv2Client.
 * Reads credentials from env vars on first call; reuses the instance after that.
 */
export function getSESClient(): SESv2Client {
  if (!client) {
    client = new SESv2Client({
      region: process.env.AWS_SES_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SES_SECRET_KEY!,
      },
    });
  }
  return client;
}
