// Validate critical environment variables at build/startup time
const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const PLACEHOLDER_VALUES = [
  'change-me-to-a-random-secret',
  'your-secret-here',
  'TODO',
];

export function validateEnv() {
  const missing: string[] = [];
  const placeholder: string[] = [];

  for (const key of REQUIRED_VARS) {
    const val = process.env[key];
    if (!val) missing.push(key);
    else if (PLACEHOLDER_VALUES.includes(val)) placeholder.push(key);
  }

  // Also check INTERNAL_WEBHOOK_SECRET specifically
  const webhookSecret = process.env.INTERNAL_WEBHOOK_SECRET;
  if (webhookSecret && PLACEHOLDER_VALUES.includes(webhookSecret)) {
    console.warn('[ENV] WARNING: INTERNAL_WEBHOOK_SECRET is using a placeholder value. Please set a strong random secret.');
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[ENV] WARNING: CRON_SECRET is not set. Cron endpoints may not work correctly.');
  }

  if (missing.length > 0) {
    console.error(`[ENV] Missing required environment variables: ${missing.join(', ')}`);
  }
  if (placeholder.length > 0) {
    console.warn(`[ENV] Placeholder values detected for: ${placeholder.join(', ')}. Please set real values.`);
  }
}
