import { Pool } from "pg";
import fs from "fs";
import path from "path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
}

async function test() {
  loadEnvLocal();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const countRes = await pool.query("SELECT COUNT(*) FROM vit_users");
    console.log("Total rows in DB:", countRes.rows[0].count);
    const rowsRes = await pool.query("SELECT * FROM vit_users");
    console.log("Rows:", rowsRes.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

test();
