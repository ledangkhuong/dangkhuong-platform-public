/**
 * One-off: apply 20260525_add_assigned_to_orders.sql
 * Adapted from run-migration.mjs pattern.
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
const DB_PASSWORD = env.SUPABASE_DB_PASSWORD || env.DATABASE_PASSWORD || env.POSTGRES_PASSWORD || SERVICE_ROLE_KEY;

const projectRef = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");
console.log(`Project ref: ${projectRef}`);
console.log(`Using password source: ${env.SUPABASE_DB_PASSWORD ? "SUPABASE_DB_PASSWORD" : env.DATABASE_PASSWORD ? "DATABASE_PASSWORD" : env.POSTGRES_PASSWORD ? "POSTGRES_PASSWORD" : "SERVICE_ROLE_KEY (likely wrong)"}`);

const sqlFile = path.join(__dirname, "..", "supabase", "migrations", "20260525_add_assigned_to_orders.sql");
const sql = fs.readFileSync(sqlFile, "utf-8");
console.log(`SQL file: ${sqlFile} (${sql.length} chars)`);

async function tryConn(label, config) {
  console.log(`\n--- ${label} ---`);
  const client = new pg.Client({ ...config, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    console.log("Connected. Running SQL...");
    await client.query(sql);
    console.log("Migration applied.");
    // verify
    const r = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='assigned_to'");
    console.log(`Verify: orders.assigned_to exists = ${r.rowCount === 1}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed: ${err.message}`);
    try { await client.end(); } catch {}
    return false;
  }
}

async function main() {
  const attempts = [
    ["Direct db.{ref}.supabase.co:5432", { host: `db.${projectRef}.supabase.co`, port: 5432, database: "postgres", user: "postgres", password: DB_PASSWORD }],
  ];
  for (const region of ["ap-southeast-1", "us-east-1", "eu-west-1", "ap-northeast-1", "us-west-1"]) {
    attempts.push([`Pooler ${region}:6543 (transaction)`, { host: `aws-0-${region}.pooler.supabase.com`, port: 6543, database: "postgres", user: `postgres.${projectRef}`, password: DB_PASSWORD }]);
    attempts.push([`Pooler ${region}:5432 (session)`, { host: `aws-0-${region}.pooler.supabase.com`, port: 5432, database: "postgres", user: `postgres.${projectRef}`, password: DB_PASSWORD }]);
  }
  for (const [label, cfg] of attempts) {
    if (await tryConn(label, cfg)) return;
  }
  console.log("\n=== ALL ATTEMPTS FAILED ===");
  console.log("Need real DB password — service_role_key is a JWT, not the postgres password.");
  console.log("Get it from: https://supabase.com/dashboard/project/" + projectRef + "/settings/database");
  console.log("Then add to .env.local as SUPABASE_DB_PASSWORD=...");
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
