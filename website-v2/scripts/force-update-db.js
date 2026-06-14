const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const usersJsonPath = path.join(__dirname, '..', 'data', 'users_rbac.json');

async function run() {
  console.log("Starting force update of Master Admin profile...");

  // 1. Update fallback JSON file
  try {
    const defaults = {
      users: [
        { id: "1", name: "Veera Nithin", email: "veeranithin9@gmail.com", role: "ADMIN MASTER", status: "active", verified: true, activity: "Active 2m ago", joinedDate: "2026-01-10", activeDevices: 2, premium: true, password: "check" },
        { id: "2", name: "Sarah Connor", email: "sarah@vitap.ac.in", role: "Developer", status: "active", verified: true, activity: "Active 4h ago", joinedDate: "2026-02-15", activeDevices: 1, premium: true, password: "check" },
        { id: "3", name: "Alex Mercer", email: "mercer@vitap.ac.in", role: "Auditor", status: "suspended", verified: false, activity: "Banned 2d ago", joinedDate: "2026-03-01", activeDevices: 0, premium: false, password: "check" },
        { id: "4", name: "David Lightman", email: "david.23bce@vitap.ac.in", role: "Contributor", status: "pending", verified: false, activity: "Registered 1h ago", joinedDate: "2026-06-12", activeDevices: 3, premium: false, password: "check" },
      ],
      rbac: {
        "ADMIN MASTER": { users: true, rbac: true, analytics: true, content: true, system: true, security: true, settings: true },
        "Super Admin": { users: true, rbac: true, analytics: true, content: true, system: true, security: true, settings: true },
        Developer: { users: false, rbac: false, analytics: true, content: true, system: true, security: false, settings: false },
        Auditor: { users: true, rbac: false, analytics: true, content: false, system: false, security: true, settings: false },
        Contributor: { users: false, rbac: false, analytics: false, content: true, system: false, security: false, settings: false },
      }
    };

    const dir = path.dirname(usersJsonPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(usersJsonPath, JSON.stringify(defaults, null, 2), 'utf8');
    console.log("Successfully updated JSON database file at:", usersJsonPath);
  } catch (e) {
    console.error("Error writing JSON file:", e);
  }

  // 2. Update Postgres database
  if (process.env.DATABASE_URL) {
    console.log("PostgreSQL DATABASE_URL is present. Connecting to update DB...");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      // Upsert/Update Veera Nithin user record
      await pool.query(`
        INSERT INTO vit_users (id, name, email, role, status, verified, activity, joined_date, active_devices, premium, password)
        VALUES ('1', 'Veera Nithin', 'veeranithin9@gmail.com', 'ADMIN MASTER', 'active', true, 'Active 2m ago', '2026-01-10', 2, true, 'check')
        ON CONFLICT (id) 
        DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role, password = EXCLUDED.password;
      `);
      console.log("Successfully upserted user ID '1' to 'Veera Nithin' in Postgres!");

      // Seed ADMIN MASTER permissions
      const adminMasterPerms = { users: true, rbac: true, analytics: true, content: true, system: true, security: true, settings: true };
      await pool.query(`
        INSERT INTO vit_rbac (role, permissions)
        VALUES ('ADMIN MASTER', $1)
        ON CONFLICT (role)
        DO UPDATE SET permissions = EXCLUDED.permissions;
      `, [JSON.stringify(adminMasterPerms)]);
      console.log("Successfully seeded 'ADMIN MASTER' RBAC permissions in Postgres!");

    } catch (err) {
      console.error("Error updating Postgres database:", err);
    } finally {
      await pool.end();
    }
  } else {
    console.log("No PostgreSQL environment variable detected. Skipping Postgres update.");
  }
}

run().then(() => console.log("Done."));
