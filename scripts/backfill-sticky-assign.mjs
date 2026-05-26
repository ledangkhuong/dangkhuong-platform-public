/**
 * One-off backfill: populate `assigned_to` on existing orders, course_interests,
 * and crm_deals using the customer's `crm_contacts.assigned_to` value, and also
 * sync `profiles.account_manager_id` from the contact's owner.
 *
 * Mirrors the runtime "sticky" rule applied by the new hooks: once a contact is
 * owned by a sale, every related row should be owned by the same sale (unless
 * the row already has its own owner — we never overwrite).
 *
 * Connection pattern adapted from scripts/run-assigned-to-migration.mjs.
 * Idempotent: re-running results in 0 additional updates because each UPDATE
 * is guarded by `WHERE <table>.assigned_to IS NULL` (or `account_manager_id IS NULL`).
 *
 * Usage: node scripts/backfill-sticky-assign.mjs
 * If all connection strategies fail with auth, set SUPABASE_DB_PASSWORD in
 * .env.local (grab it from the Supabase dashboard → Settings → Database).
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD =
  env.SUPABASE_DB_PASSWORD ||
  env.DATABASE_PASSWORD ||
  env.POSTGRES_PASSWORD ||
  SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("NEXT_PUBLIC_SUPABASE_URL missing from .env.local");
  process.exit(1);
}

const projectRef = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");
console.log(`Project ref: ${projectRef}`);
console.log(
  `Using password source: ${
    env.SUPABASE_DB_PASSWORD
      ? "SUPABASE_DB_PASSWORD"
      : env.DATABASE_PASSWORD
      ? "DATABASE_PASSWORD"
      : env.POSTGRES_PASSWORD
      ? "POSTGRES_PASSWORD"
      : "SERVICE_ROLE_KEY (likely wrong)"
  }`
);

const PREVIEW_SQL = {
  orders: `
    WITH src AS (
      SELECT c.assigned_to AS sale_id, lower(c.email) AS email
      FROM public.crm_contacts c
      WHERE c.assigned_to IS NOT NULL AND c.email IS NOT NULL
    )
    SELECT COUNT(*)::int AS n
    FROM public.orders o
    JOIN src ON lower(o.customer_email) = src.email
    WHERE o.assigned_to IS NULL;
  `,
  interests: `
    WITH src AS (
      SELECT c.assigned_to AS sale_id, c.user_id
      FROM public.crm_contacts c
      WHERE c.assigned_to IS NOT NULL AND c.user_id IS NOT NULL
    )
    SELECT COUNT(*)::int AS n
    FROM public.course_interests i
    JOIN src ON i.user_id = src.user_id
    WHERE i.assigned_to IS NULL;
  `,
  deals: `
    WITH src AS (
      SELECT c.id AS contact_id, c.assigned_to AS sale_id
      FROM public.crm_contacts c
      WHERE c.assigned_to IS NOT NULL
    )
    SELECT COUNT(*)::int AS n
    FROM public.crm_deals d
    JOIN src ON d.contact_id = src.contact_id
    WHERE d.assigned_to IS NULL;
  `,
  profiles: `
    SELECT COUNT(*)::int AS n
    FROM public.profiles p
    JOIN public.crm_contacts c ON c.user_id = p.id
    WHERE c.assigned_to IS NOT NULL
      AND c.user_id IS NOT NULL
      AND p.account_manager_id IS NULL;
  `,
};

const UPDATE_SQL = {
  orders: `
    WITH src AS (
      SELECT c.assigned_to AS sale_id, lower(c.email) AS email
      FROM public.crm_contacts c
      WHERE c.assigned_to IS NOT NULL AND c.email IS NOT NULL
    )
    UPDATE public.orders o
    SET assigned_to = src.sale_id
    FROM src
    WHERE o.assigned_to IS NULL
      AND lower(o.customer_email) = src.email;
  `,
  interests: `
    WITH src AS (
      SELECT c.assigned_to AS sale_id, c.user_id
      FROM public.crm_contacts c
      WHERE c.assigned_to IS NOT NULL AND c.user_id IS NOT NULL
    )
    UPDATE public.course_interests i
    SET assigned_to = src.sale_id
    FROM src
    WHERE i.assigned_to IS NULL
      AND i.user_id = src.user_id;
  `,
  deals: `
    WITH src AS (
      SELECT c.id AS contact_id, c.assigned_to AS sale_id
      FROM public.crm_contacts c
      WHERE c.assigned_to IS NOT NULL
    )
    UPDATE public.crm_deals d
    SET assigned_to = src.sale_id
    FROM src
    WHERE d.assigned_to IS NULL
      AND d.contact_id = src.contact_id;
  `,
  profiles: `
    UPDATE public.profiles p
    SET account_manager_id = c.assigned_to
    FROM public.crm_contacts c
    WHERE c.user_id = p.id
      AND c.assigned_to IS NOT NULL
      AND c.user_id IS NOT NULL
      AND p.account_manager_id IS NULL;
  `,
};

async function runBackfill(client) {
  console.log("\nConnected. Running backfill in a single transaction...");
  await client.query("BEGIN");
  try {
    // Preview counts (what WILL be updated).
    const previewOrders = await client.query(PREVIEW_SQL.orders);
    const previewInterests = await client.query(PREVIEW_SQL.interests);
    const previewDeals = await client.query(PREVIEW_SQL.deals);
    const previewProfiles = await client.query(PREVIEW_SQL.profiles);
    const pOrders = previewOrders.rows[0]?.n ?? 0;
    const pInterests = previewInterests.rows[0]?.n ?? 0;
    const pDeals = previewDeals.rows[0]?.n ?? 0;
    const pProfiles = previewProfiles.rows[0]?.n ?? 0;
    console.log(
      `Would update: orders=${pOrders}, interests=${pInterests}, deals=${pDeals}, profiles=${pProfiles}`
    );

    // Apply updates.
    const updOrders = await client.query(UPDATE_SQL.orders);
    const updInterests = await client.query(UPDATE_SQL.interests);
    const updDeals = await client.query(UPDATE_SQL.deals);
    const updProfiles = await client.query(UPDATE_SQL.profiles);

    await client.query("COMMIT");

    console.log(
      `Actually updated: orders=${updOrders.rowCount}, interests=${updInterests.rowCount}, deals=${updDeals.rowCount}, profiles=${updProfiles.rowCount}`
    );
    console.log(
      `\n=== Backfill complete: orders=${updOrders.rowCount}, course_interests=${updInterests.rowCount}, crm_deals=${updDeals.rowCount}, profiles=${updProfiles.rowCount} ===`
    );
    return true;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw err;
  }
}

async function tryConn(label, config) {
  console.log(`\n--- ${label} ---`);
  const client = new pg.Client({
    ...config,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    await runBackfill(client);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed: ${err.message}`);
    try {
      await client.end();
    } catch {}
    return false;
  }
}

async function main() {
  const attempts = [
    [
      "Direct db.{ref}.supabase.co:5432",
      {
        host: `db.${projectRef}.supabase.co`,
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: DB_PASSWORD,
      },
    ],
  ];
  for (const region of [
    "ap-southeast-1",
    "us-east-1",
    "eu-west-1",
    "ap-northeast-1",
    "us-west-1",
  ]) {
    attempts.push([
      `Pooler ${region}:6543 (transaction)`,
      {
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 6543,
        database: "postgres",
        user: `postgres.${projectRef}`,
        password: DB_PASSWORD,
      },
    ]);
    attempts.push([
      `Pooler ${region}:5432 (session)`,
      {
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 5432,
        database: "postgres",
        user: `postgres.${projectRef}`,
        password: DB_PASSWORD,
      },
    ]);
  }
  for (const [label, cfg] of attempts) {
    if (await tryConn(label, cfg)) return;
  }
  console.log("\n=== ALL ATTEMPTS FAILED ===");
  console.log(
    "Need real DB password — service_role_key is a JWT, not the postgres password."
  );
  console.log(
    "Get it from: https://supabase.com/dashboard/project/" +
      projectRef +
      "/settings/database"
  );
  console.log("Then add to .env.local as SUPABASE_DB_PASSWORD=...");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
