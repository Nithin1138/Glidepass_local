const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local if it exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove surrounding quotes if any
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

async function run() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL found in env. Skipping PostgreSQL migration.");
    return;
  }

  console.log("Connecting to PostgreSQL...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    console.log("Applying categories column migration to hubs table...");
    await client.query("ALTER TABLE hubs ADD COLUMN IF NOT EXISTS categories TEXT DEFAULT '[]';");
    console.log("Applying category and topic column migration to vit_resources table...");
    await client.query("ALTER TABLE vit_resources ADD COLUMN IF NOT EXISTS hub_id TEXT DEFAULT NULL;");
    await client.query("ALTER TABLE vit_resources ADD COLUMN IF NOT EXISTS sub_category TEXT DEFAULT NULL;");
    await client.query("ALTER TABLE vit_resources ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;");
    await client.query("ALTER TABLE vit_resources ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT NULL;");
    await client.query("ALTER TABLE vit_resources ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;");
    await client.query("ALTER TABLE vit_resources ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;");
    console.log("Migration applied successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
