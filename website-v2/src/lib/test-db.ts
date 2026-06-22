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

async function seed() {
  loadEnvLocal();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log("Seeding missing users...");
    
    // Check if Developer exists
    const devRes = await pool.query("SELECT * FROM vit_users WHERE email = $1", ["sarah@vitap.ac.in"]);
    if (devRes.rows.length === 0) {
      console.log("Inserting Sarah Connor (Developer)...");
      await pool.query(
        `INSERT INTO vit_users (id, name, email, role, status, verified, activity, joined_date, active_devices, premium, password, consent_emails, referral)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        ["2", "Sarah Connor", "sarah@vitap.ac.in", "Developer", "active", true, "Active 4h ago", "2026-02-15", 1, true, "check", true, "GitHub"]
      );
    }
    
    // Check if Contributor exists
    const contribRes = await pool.query("SELECT * FROM vit_users WHERE email = $1", ["david.23bce@vitap.ac.in"]);
    if (contribRes.rows.length === 0) {
      console.log("Inserting David Lightman (Contributor)...");
      await pool.query(
        `INSERT INTO vit_users (id, name, email, role, status, verified, activity, joined_date, active_devices, premium, password, consent_emails, referral)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        ["4", "David Lightman", "david.23bce@vitap.ac.in", "Contributor", "pending", false, "Registered 1h ago", "2026-06-12", 3, false, "check", false, "Friends"]
      );
    }

    console.log("Seeding complete!");
  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}

seed();
