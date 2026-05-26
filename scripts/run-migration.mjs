/**
 * Migration runner — executes SQL on the Supabase database
 * Uses the service role key to authenticate via the Supabase pooler
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read .env.local
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// Extract project ref from URL
const projectRef = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");
console.log(`Project ref: ${projectRef}`);

// Read SQL file
const sqlFile = path.join(__dirname, "migrate-instructor-community.sql");
const sql = fs.readFileSync(sqlFile, "utf-8");

// Try different connection approaches
async function tryDirectConnection() {
  console.log("\n--- Trying direct database connection ---");
  const client = new pg.Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: SERVICE_ROLE_KEY,
    ssl: true,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log("Connected via direct connection!");
    const result = await client.query(sql);
    console.log("Migration executed successfully!");
    console.log("Result:", result);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Direct connection failed: ${err.message}`);
    try { await client.end(); } catch {}
    return false;
  }
}

async function tryPoolerConnection(region) {
  console.log(`\n--- Trying pooler connection (${region}) ---`);
  const client = new pg.Client({
    host: `aws-0-${region}.pooler.supabase.com`,
    port: 5432,
    database: "postgres",
    user: `postgres.${projectRef}`,
    password: SERVICE_ROLE_KEY,
    ssl: true,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log(`Connected via pooler (${region})!`);
    const result = await client.query(sql);
    console.log("Migration executed successfully!");
    await client.end();
    return true;
  } catch (err) {
    console.log(`Pooler connection (${region}) failed: ${err.message}`);
    try { await client.end(); } catch {}
    return false;
  }
}

async function trySessionPooler(region) {
  console.log(`\n--- Trying session pooler (${region}, port 5432) ---`);
  const client = new pg.Client({
    host: `aws-0-${region}.pooler.supabase.com`,
    port: 5432,
    database: "postgres",
    user: `postgres.${projectRef}`,
    password: SERVICE_ROLE_KEY,
    ssl: true,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log(`Connected via session pooler (${region})!`);
    const result = await client.query(sql);
    console.log("Migration executed successfully!");
    await client.end();
    return true;
  } catch (err) {
    console.log(`Session pooler (${region}) failed: ${err.message}`);
    try { await client.end(); } catch {}
    return false;
  }
}

async function main() {
  console.log("=== Supabase Migration Runner ===");
  console.log(`SQL file: ${sqlFile}`);
  console.log(`SQL length: ${sql.length} chars`);

  // Try direct connection first
  if (await tryDirectConnection()) return;

  // Try pooler with different regions
  const regions = ["ap-southeast-1", "us-east-1", "eu-west-1", "us-west-1", "ap-northeast-1"];
  for (const region of regions) {
    if (await tryPoolerConnection(region)) return;
    if (await trySessionPooler(region)) return;
  }

  console.log("\n============================================");
  console.log("Could not connect to database automatically.");
  console.log("Please run the SQL migration manually:");
  console.log("1. Go to https://supabase.com/dashboard");
  console.log("2. Select project: " + projectRef);
  console.log("3. Go to SQL Editor");
  console.log("4. Paste the contents of: scripts/migrate-instructor-community.sql");
  console.log("5. Click 'Run'");
  console.log("============================================");
}

main().catch(console.error);
