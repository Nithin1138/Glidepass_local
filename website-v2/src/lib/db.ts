import { Pool } from "pg";
import fs from "fs";
import path from "path";

// Initialize Postgres pool only if DATABASE_URL is provided
const isPostgresEnabled = !!process.env.DATABASE_URL;
let pool: Pool | null = null;

if (isPostgresEnabled) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for serverless providers like Neon/Supabase
    },
  });
}

// Fallback JSON database paths (same as existing API)
const getJsonFilePath = () => {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
  return path.join(baseDir, "vitcodes.json");
};

// Use globalThis to persist the db initialization state across Next.js API route hot-reloads
const globalDb = globalThis as unknown as { isDbInitialized: boolean };
let isDbInitialized = globalDb.isDbInitialized || false;

// Helper to parse VIT email into metadata
export function parseVitEmail(email: string) {
  const parts = email.split("@");
  if (parts.length !== 2) return { name: "unknown", regno: "unknown", college: "unknown" };
  const localPart = parts[0];
  const domain = parts[1].toLowerCase();

  // Parse Name & Register Number from local part (e.g. nithin.23bce20064 -> Name: Nithin, Regno: 23bce20064)
  const dotIndex = localPart.indexOf(".");
  let name = localPart;
  let regno = "unknown";
  if (dotIndex !== -1) {
    name = localPart.substring(0, dotIndex);
    regno = localPart.substring(dotIndex + 1);
  }
  // Capitalize name first letter
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  // Parse College from domain
  let college = "unknown";
  if (domain.includes("vitap")) {
    college = "vit-ap";
  } else if (domain.includes("vitbhopal")) {
    college = "vit-bhopal";
  } else if (domain.includes("vitchennai") || domain.includes("chennai")) {
    college = "vit-chennai";
  } else if (domain.includes("vitstudent") || domain.includes("vellore")) {
    // Default vitstudent domain is Vellore
    college = "vit-vellore";
  } else {
    college = domain.split(".")[0];
  }

  return { name, regno, college };
}

// Initialize Postgres tables
export async function initDb() {
  if (!pool || isDbInitialized) return;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_sessions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        exam_type TEXT NOT NULL,
        title TEXT
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_questions (
        id TEXT PRIMARY KEY,
        session_id TEXT REFERENCES vit_sessions(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        code TEXT NOT NULL,
        language TEXT NOT NULL,
        comment TEXT,
        contributor_email TEXT,
        contributor_name TEXT,
        contributor_regno TEXT,
        contributor_college TEXT
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_contributors (
        email TEXT PRIMARY KEY,
        status TEXT DEFAULT 'active',
        name TEXT,
        regno TEXT,
        college TEXT
      );
    `);

    // Ensure say_my_name column exists
    await client.query(`
      ALTER TABLE vit_contributors ADD COLUMN IF NOT EXISTS say_my_name BOOLEAN DEFAULT false;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_exam_rules (
        exam_type TEXT PRIMARY KEY,
        rule TEXT NOT NULL,
        session_limit INTEGER DEFAULT 1
      );
    `);

    // Ensure session_limit column exists
    await client.query(`
      ALTER TABLE vit_exam_rules ADD COLUMN IF NOT EXISTS session_limit INTEGER DEFAULT 1;
    `);

    // Ensure is_deleted column exists
    await client.query(`
      ALTER TABLE vit_sessions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    `);
    await client.query(`
      ALTER TABLE vit_questions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    `);
    
    // Ensure is_locked column exists for questions
    await client.query(`
      ALTER TABLE vit_questions ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
    `);

    // Ensure edits column exists for question edit logging
    await client.query(`
      ALTER TABLE vit_questions ADD COLUMN IF NOT EXISTS edits TEXT DEFAULT '[]';
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_downloads (
        id SERIAL PRIMARY KEY,
        platform TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_heartbeats (
        id SERIAL PRIMARY KEY,
        uuid TEXT NOT NULL,
        platform TEXT NOT NULL,
        app_version TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_telemetry_events (
        id SERIAL PRIMARY KEY,
        uuid TEXT NOT NULL,
        event TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_audit_logs (
        id SERIAL PRIMARY KEY,
        event TEXT NOT NULL,
        username TEXT NOT NULL,
        ip TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_subscriptions (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        plan TEXT NOT NULL,
        amount TEXT NOT NULL,
        status TEXT NOT NULL,
        date TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_coupons (
        code TEXT PRIMARY KEY,
        discount TEXT NOT NULL,
        usage INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        verified BOOLEAN DEFAULT false,
        activity TEXT,
        joined_date TEXT NOT NULL,
        active_devices INTEGER DEFAULT 0,
        premium BOOLEAN DEFAULT false,
        password TEXT DEFAULT 'check'
      );
    `);

    await client.query(`
      ALTER TABLE vit_users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'check';
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_rbac (
        role TEXT PRIMARY KEY,
        permissions TEXT NOT NULL
      );
    `);

    const auditCountRes = await client.query("SELECT COUNT(*) FROM vit_audit_logs");
    if (parseInt(auditCountRes.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO vit_audit_logs (event, username, ip, status, timestamp) VALUES
        ('Admin Session Terminated', 'Nithin', '192.168.1.15', 'success', NOW() - INTERVAL '1 hour'),
        ('Failed Auth Attempt', 'Unknown', '198.51.100.42', 'failed', NOW() - INTERVAL '2 hours'),
        ('VIT Database Modified', 'Nithin', '10.251.103.162', 'warning', NOW() - INTERVAL '3 hours'),
        ('SSL Handshake Verified', 'System', '127.0.0.1', 'success', NOW() - INTERVAL '4 hours');
      `);
    }

    const subsCountRes = await client.query("SELECT COUNT(*) FROM vit_subscriptions");
    if (parseInt(subsCountRes.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO vit_subscriptions (id, email, plan, amount, status, date) VALUES
        ('TXN_001', 'student1@vitap.ac.in', 'Monthly Pass', '₹99', 'success', '2026-06-14 10:15'),
        ('TXN_002', 'student2@vitap.ac.in', 'Yearly Pass', '₹499', 'success', '2026-06-14 09:30'),
        ('TXN_003', 'student3@vitstudent.ac.in', 'Monthly Pass', '₹99', 'failed', '2026-06-13 18:45'),
        ('TXN_004', 'student4@vit.ac.in', 'Semester Pass', '₹249', 'success', '2026-06-13 14:20');
      `);
    }

    const couponsCountRes = await client.query("SELECT COUNT(*) FROM vit_coupons");
    if (parseInt(couponsCountRes.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO vit_coupons (code, discount, usage, status) VALUES
        ('VITAP50', '50%', 42, 'active'),
        ('FREEWEEK', '100%', 118, 'active'),
        ('WELCOME10', '20%', 5, 'expired');
      `);
    }

    const usersCountRes = await client.query("SELECT COUNT(*) FROM vit_users");
    if (parseInt(usersCountRes.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO vit_users (id, name, email, role, status, verified, activity, joined_date, active_devices, premium, password) VALUES
        ('1', 'Veera Nithin', 'veeranithin9@gmail.com', 'ADMIN MASTER', 'active', true, 'Active 2m ago', '2026-01-10', 2, true, 'check'),
        ('2', 'Sarah Connor', 'sarah@vitap.ac.in', 'Developer', 'active', true, 'Active 4h ago', '2026-02-15', 1, true, 'check'),
        ('3', 'Alex Mercer', 'mercer@vitap.ac.in', 'Auditor', 'suspended', false, 'Banned 2d ago', '2026-03-01', 0, false, 'check'),
        ('4', 'David Lightman', 'david.23bce@vitap.ac.in', 'Contributor', 'pending', false, 'Registered 1h ago', '2026-06-12', 3, false, 'check');
      `);
    } else {
      // Force update user 1 to ADMIN MASTER and Veera Nithin
      await client.query(`
        INSERT INTO vit_users (id, name, email, role, status, verified, activity, joined_date, active_devices, premium, password)
        VALUES ('1', 'Veera Nithin', 'veeranithin9@gmail.com', 'ADMIN MASTER', 'active', true, 'Active 2m ago', '2026-01-10', 2, true, 'check')
        ON CONFLICT (id)
        DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;
      `);
    }

    const rbacCountRes = await client.query("SELECT COUNT(*) FROM vit_rbac");
    if (parseInt(rbacCountRes.rows[0].count, 10) === 0) {
      const defaultRbac = {
        "ADMIN MASTER": { users: true, rbac: true, analytics: true, content: true, system: true, security: true, settings: true },
        "Super Admin": { users: true, rbac: true, analytics: true, content: true, system: true, security: true, settings: true },
        Developer: { users: false, rbac: false, analytics: true, content: true, system: true, security: false, settings: false },
        Auditor: { users: true, rbac: false, analytics: true, content: false, system: false, security: true, settings: false },
        Contributor: { users: false, rbac: false, analytics: false, content: true, system: false, security: false, settings: false },
      };
      for (const [role, perms] of Object.entries(defaultRbac)) {
        await client.query("INSERT INTO vit_rbac (role, permissions) VALUES ($1, $2)", [role, JSON.stringify(perms)]);
      }
    } else {
      const adminMasterPerms = { users: true, rbac: true, analytics: true, content: true, system: true, security: true, settings: true };
      await client.query(`
        INSERT INTO vit_rbac (role, permissions)
        VALUES ('ADMIN MASTER', $1)
        ON CONFLICT (role)
        DO UPDATE SET permissions = EXCLUDED.permissions;
      `, [JSON.stringify(adminMasterPerms)]);
    }
    
    // Initialize Monetization Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_licenses (
        key TEXT PRIMARY KEY,
        tier TEXT NOT NULL,
        email TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query("ALTER TABLE vit_licenses ADD COLUMN IF NOT EXISTS hwid TEXT;");


    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const monetizationRes = await client.query("SELECT COUNT(*) FROM vit_settings WHERE key = 'monetization_settings'");
    if (parseInt(monetizationRes.rows[0].count, 10) === 0) {
      const defaultSettings = {
        monetization_enabled: false,
        free_enabled: false,
          {
            tier: "Free",
            title: "Free Pass",
            subtitle: "Basic access limits",
            price: "₹0",
            validity_days: 365,
            max_sessions: 999,
            max_vitcodes: 999,
            allow_live_sync: 0,
            allow_typing: 0,
            allow_typing_mode: 0,
            allow_inject: 0,
            allow_raw: 0,
            allow_select_copy: 0,
            allow_fetch: 0,
            allow_refill: 0,
            allow_vitcode: 0,
            allow_tunnel: -1
          },
          { tier: "Basic", title: "Week Pass", subtitle: "Perfect for exam weeks", price: "₹39", validity_days: 7, allow_tunnel: -1 },
          { tier: "Pro", title: "Monthly Pass", subtitle: "Consistent connectivity", price: "₹99", validity_days: 30, allow_tunnel: 0 },
          { tier: "Max", title: "Sem Pass", subtitle: "Semester companion", price: "₹299", validity_days: 120, allow_tunnel: 0 },
          { tier: "Ultra", title: "Yearly Pass", subtitle: "Year-round connectivity", price: "₹499", validity_days: 365, allow_tunnel: 0 }
        ]
      };
      await client.query("INSERT INTO vit_settings (key, value) VALUES ('monetization_settings', $1)", [JSON.stringify(defaultSettings)]);
    }

    isDbInitialized = true;
    globalDb.isDbInitialized = true;
  } catch (error) {
    console.error("Database initialization failed:", error);
  } finally {
    client.release();
  }
}

export interface Question {
  id: string;
  title: string;
  code: string;
  language: string;
  comment?: string;
  contributorEmail?: string;
  contributorName?: string;
  contributorRegno?: string;
  contributorCollege?: string;
  isDeleted?: boolean;
  isLocked?: boolean;
  edits?: any[];
}

export interface VitCode {
  id: string;
  date: string;
  examType: string;
  title?: string;
  questions: Question[];
  isDeleted?: boolean;
}

export async function readCodes(includeDeleted = false): Promise<VitCode[]> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      // Fetch all sessions (filtered or not)
      const sessionsQuery = includeDeleted
        ? "SELECT * FROM vit_sessions ORDER BY date DESC, id DESC"
        : "SELECT * FROM vit_sessions WHERE is_deleted = false ORDER BY date DESC, id DESC";
      const sessionsRes = await client.query(sessionsQuery);

      // Fetch all questions (filtered or not)
      const questionsQuery = includeDeleted
        ? `SELECT q.*, c.say_my_name, c.name as contributor_db_name
           FROM vit_questions q
           LEFT JOIN vit_contributors c ON q.contributor_email = c.email`
        : `SELECT q.*, c.say_my_name, c.name as contributor_db_name
           FROM vit_questions q
           LEFT JOIN vit_contributors c ON q.contributor_email = c.email
           WHERE q.is_deleted = false`;
      const questionsRes = await client.query(questionsQuery);
      
      const questionsBySession: Record<string, Question[]> = {};
      questionsRes.rows.forEach((row) => {
        let parsedEdits = [];
        if (row.edits) {
          try {
            parsedEdits = JSON.parse(row.edits);
          } catch (e) {
            parsedEdits = [];
          }
        }
        const q: Question = {
          id: row.id,
          title: row.title,
          code: row.code,
          language: row.language,
          comment: row.comment,
          contributorEmail: row.contributor_email,
          contributorName: row.say_my_name ? (row.contributor_db_name || row.contributor_name) : undefined,
          contributorRegno: row.contributor_regno,
          contributorCollege: row.contributor_college,
          isDeleted: !!row.is_deleted,
          isLocked: !!row.is_locked,
          edits: parsedEdits,
        };
        if (!questionsBySession[row.session_id]) {
          questionsBySession[row.session_id] = [];
        }
        questionsBySession[row.session_id].push(q);
      });

      return sessionsRes.rows.map((row) => ({
        id: row.id,
        date: row.date,
        examType: row.exam_type,
        title: row.title || undefined,
        isDeleted: !!row.is_deleted,
        questions: questionsBySession[row.id] || [],
      }));
    } catch (error) {
      console.error("Error reading from Postgres:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Fallback to JSON file
  const filePath = getJsonFilePath();
  if (!fs.existsSync(filePath)) {
    const defaultFilePath = path.join(process.cwd(), "public", "templates", "vitcodes.json");
    if (fs.existsSync(defaultFilePath)) {
      try {
        const raw = fs.readFileSync(defaultFilePath, "utf8");
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          const sessions = data.map((s: any) => ({
            ...s,
            isDeleted: !!s.isDeleted,
            questions: (Array.isArray(s.questions) ? s.questions : []).map((q: any) => ({
              ...q,
              isDeleted: !!q.isDeleted,
              isLocked: !!q.isLocked
            }))
          }));
          if (includeDeleted) return sessions;
          return sessions
            .filter((s: any) => !s.isDeleted)
            .map((s: any) => ({
              ...s,
              questions: s.questions.filter((q: any) => !q.isDeleted)
            }));
        }
      } catch (e) {}
    }
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      const sessions = data.map((s: any) => ({
        ...s,
        isDeleted: !!s.isDeleted,
        questions: (Array.isArray(s.questions) ? s.questions : []).map((q: any) => ({
          ...q,
          isDeleted: !!q.isDeleted,
          isLocked: !!q.isLocked
        }))
      }));
      if (includeDeleted) return sessions;
      return sessions
        .filter((s: any) => !s.isDeleted)
        .map((s: any) => ({
          ...s,
          questions: s.questions.filter((q: any) => !q.isDeleted)
        }));
    }
    return [];
  } catch (error) {
    return [];
  }
}

export async function writeCodes(data: VitCode[]): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      // Clear all existing data
      await client.query("DELETE FROM vit_questions");
      await client.query("DELETE FROM vit_sessions");

      // Insert fresh data
      for (const session of data) {
        await client.query(
          "INSERT INTO vit_sessions (id, date, exam_type, title, is_deleted) VALUES ($1, $2, $3, $4, $5)",
          [session.id, session.date, session.examType, session.title || null, session.isDeleted || false]
        );

        for (const q of session.questions) {
          const parsed = q.contributorEmail ? parseVitEmail(q.contributorEmail) : { name: null, regno: null, college: null };
          await client.query(
            "INSERT INTO vit_questions (id, session_id, title, code, language, comment, contributor_email, contributor_name, contributor_regno, contributor_college, is_deleted, edits) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
            [
              q.id,
              session.id,
              q.title,
              q.code,
              q.language,
              q.comment || null,
              q.contributorEmail || null,
              q.contributorName || parsed.name || null,
              q.contributorRegno || parsed.regno || null,
              q.contributorCollege || parsed.college || null,
              q.isDeleted || false,
              q.edits ? JSON.stringify(q.edits) : "[]"
            ]
          );
        }
      }

      await client.query("COMMIT");
      return;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error writing to Postgres:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Fallback to JSON file
  const filePath = getJsonFilePath();
  const parentDir = path.dirname(filePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// ─── Granular Operations ───

export async function createSession(session: VitCode): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        "INSERT INTO vit_sessions (id, date, exam_type, title, is_deleted) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET date=$2, exam_type=$3, title=$4, is_deleted=$5",
        [session.id, session.date, session.examType, session.title || null, session.isDeleted || false]
      );
    } finally {
      client.release();
    }
  } else {
    // JSON fallback
    const all = await readCodes(true);
    const existingIdx = all.findIndex(s => s.id === session.id);
    if (existingIdx !== -1) {
      all[existingIdx] = {
        ...all[existingIdx],
        date: session.date,
        examType: session.examType,
        title: session.title,
        isDeleted: session.isDeleted !== undefined ? session.isDeleted : all[existingIdx].isDeleted,
        questions: all[existingIdx].questions || []
      };
    } else {
      all.unshift({
        ...session,
        isDeleted: session.isDeleted || false,
        questions: session.questions || []
      });
    }
    await writeCodes(all);
  }
}

export async function updateQuestionLock(questionId: string, isLocked: boolean) {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("UPDATE vit_questions SET is_locked = $1 WHERE id = $2", [isLocked, questionId]);
      return;
    } catch (e) {
      console.error("Failed to update question lock in pg, falling back to JSON", e);
    } finally {
      client.release();
    }
  }
  
  const all = await readCodes(true);
  let found = false;
  for (const s of all) {
    for (const q of s.questions) {
      if (q.id === questionId) {
        q.isLocked = isLocked;
        found = true;
        break;
      }
    }
    if (found) break;
  }
  if (found) {
    await writeCodes(all);
  }
}

export async function isQuestionLocked(questionId: string): Promise<boolean> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      const res = await client.query("SELECT is_locked FROM vit_questions WHERE id = $1", [questionId]);
      if (res.rows.length > 0) {
        return !!res.rows[0].is_locked;
      }
      return false;
    } catch (e) {
      console.error("Failed to query question lock in pg, falling back to JSON", e);
    } finally {
      client.release();
    }
  }
  
  const all = await readCodes(true);
  for (const s of all) {
    for (const q of s.questions) {
      if (q.id === questionId) {
        return !!q.isLocked;
      }
    }
  }
  return false;
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("UPDATE vit_sessions SET is_deleted = true WHERE id = $1", [sessionId]);
      await client.query("UPDATE vit_questions SET is_deleted = true WHERE session_id = $1", [sessionId]);
    } finally {
      client.release();
    }
  } else {
    // JSON fallback
    const all = await readCodes(true);
    const session = all.find(s => s.id === sessionId);
    if (session) {
      session.isDeleted = true;
      if (session.questions) {
        session.questions.forEach(q => {
          q.isDeleted = true;
        });
      }
      await writeCodes(all);
    }
  }
}

export async function permanentlyDeleteSession(sessionId: string): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("DELETE FROM vit_sessions WHERE id = $1", [sessionId]);
    } finally {
      client.release();
    }
  } else {
    // JSON fallback
    const all = await readCodes(true);
    const filtered = all.filter(s => s.id !== sessionId);
    await writeCodes(filtered);
  }
}

export async function restoreSession(sessionId: string): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("UPDATE vit_sessions SET is_deleted = false WHERE id = $1", [sessionId]);
      await client.query("UPDATE vit_questions SET is_deleted = false WHERE session_id = $1", [sessionId]);
    } finally {
      client.release();
    }
  } else {
    // JSON fallback
    const all = await readCodes(true);
    const session = all.find(s => s.id === sessionId);
    if (session) {
      session.isDeleted = false;
      if (session.questions) {
        session.questions.forEach(q => {
          q.isDeleted = false;
        });
      }
      await writeCodes(all);
    }
  }
}

export async function createQuestion(sessionId: string, q: Question): Promise<void> {
  const parsed = q.contributorEmail ? parseVitEmail(q.contributorEmail) : { name: null, regno: null, college: null };
  const updatedQ: Question = {
    ...q,
    contributorName: q.contributorName || parsed.name || undefined,
    contributorRegno: q.contributorRegno || parsed.regno || undefined,
    contributorCollege: q.contributorCollege || parsed.college || undefined,
    isDeleted: q.isDeleted || false
  };

  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        "INSERT INTO vit_questions (id, session_id, title, code, language, comment, contributor_email, contributor_name, contributor_regno, contributor_college, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        [
          updatedQ.id,
          sessionId,
          updatedQ.title,
          updatedQ.code,
          updatedQ.language,
          updatedQ.comment || null,
          updatedQ.contributorEmail || null,
          updatedQ.contributorName || null,
          updatedQ.contributorRegno || null,
          updatedQ.contributorCollege || null,
          updatedQ.isDeleted || false
        ]
      );
    } finally {
      client.release();
    }
  } else {
    // JSON fallback
    const all = await readCodes(true);
    const s = all.find(s => s.id === sessionId);
    if (s) {
      if (!s.questions) s.questions = [];
      s.questions.push(updatedQ);
      await writeCodes(all);
    }
  }
}

export async function updateQuestion(q: Question, editorEmail?: string): Promise<void> {
  if (await isQuestionLocked(q.id)) {
    throw new Error("This question is locked by an admin and cannot be modified.");
  }
  
  let editsList: any[] = [];
  
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      const existingRes = await client.query("SELECT code, edits FROM vit_questions WHERE id = $1", [q.id]);
      let existingCode = "";
      if (existingRes.rows.length > 0) {
        existingCode = existingRes.rows[0].code || "";
        if (existingRes.rows[0].edits) {
          try {
            editsList = JSON.parse(existingRes.rows[0].edits);
          } catch (e) {
            editsList = [];
          }
        }
      }
      
      if (editorEmail) {
        editsList.push({
          editorEmail,
          reason: q.comment || "Updated code",
          timestamp: Date.now(),
          questionId: q.id,
          questionTitle: q.title,
          language: q.language,
          previousCode: existingCode
        });
      }
      
      await client.query(
        "UPDATE vit_questions SET title = $2, code = $3, language = $4, comment = $5, is_deleted = $6, edits = $7 WHERE id = $1",
        [q.id, q.title, q.code, q.language, q.comment || null, q.isDeleted || false, JSON.stringify(editsList)]
      );
    } finally {
      client.release();
    }
  } else {
    const all = await readCodes(true);
    for (const s of all) {
      const idx = (s.questions || []).findIndex(x => x.id === q.id);
      if (idx !== -1) {
        const existingQ = s.questions[idx];
        editsList = existingQ.edits || [];
        if (editorEmail) {
          editsList.push({
            editorEmail,
            reason: q.comment || "Updated code",
            timestamp: Date.now(),
            questionId: q.id,
            questionTitle: q.title,
            language: q.language,
            previousCode: existingQ.code || ""
          });
        }
        s.questions[idx] = {
          ...q,
          isDeleted: q.isDeleted !== undefined ? q.isDeleted : s.questions[idx].isDeleted,
          edits: editsList
        };
        await writeCodes(all);
        return;
      }
    }
  }
}

export async function deleteQuestion(qId: string): Promise<void> {
  if (await isQuestionLocked(qId)) {
    throw new Error("This question is locked by an admin and cannot be modified.");
  }
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("UPDATE vit_questions SET is_deleted = true WHERE id = $1", [qId]);
    } finally {
      client.release();
    }
  } else {
    // JSON fallback
    const all = await readCodes(true);
    for (const s of all) {
      const q = (s.questions || []).find(q => q.id === qId);
      if (q) {
        q.isDeleted = true;
        await writeCodes(all);
        return;
      }
    }
  }
}

export async function permanentlyDeleteQuestion(qId: string): Promise<void> {
  if (await isQuestionLocked(qId)) {
    throw new Error("This question is locked by an admin and cannot be modified.");
  }
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("DELETE FROM vit_questions WHERE id = $1", [qId]);
    } finally {
      client.release();
    }
  } else {
    // JSON fallback
    const all = await readCodes(true);
    for (const s of all) {
      const idx = (s.questions || []).findIndex(q => q.id === qId);
      if (idx !== -1) {
        s.questions.splice(idx, 1);
        await writeCodes(all);
        return;
      }
    }
  }
}

export async function restoreQuestion(qId: string): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("UPDATE vit_questions SET is_deleted = false WHERE id = $1", [qId]);
      const res = await client.query("SELECT session_id FROM vit_questions WHERE id = $1", [qId]);
      if (res.rows.length > 0) {
        const parentSessionId = res.rows[0].session_id;
        await client.query("UPDATE vit_sessions SET is_deleted = false WHERE id = $1", [parentSessionId]);
      }
    } finally {
      client.release();
    }
  } else {
    // JSON fallback
    const all = await readCodes(true);
    for (const s of all) {
      const q = (s.questions || []).find(q => q.id === qId);
      if (q) {
        q.isDeleted = false;
        s.isDeleted = false; // Restore parent session too
        await writeCodes(all);
        return;
      }
    }
  }
}

export interface ExamSettings {
  rules: Record<string, string>;
  sessionLimits: Record<string, number>;
}

export async function readRules(): Promise<ExamSettings> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      const res = await client.query("SELECT * FROM vit_exam_rules");
      const rules: Record<string, string> = {};
      const sessionLimits: Record<string, number> = {};
      res.rows.forEach(row => {
        rules[row.exam_type] = row.rule;
        sessionLimits[row.exam_type] = row.session_limit !== null ? row.session_limit : 1;
      });
      return { rules, sessionLimits };
    } finally {
      client.release();
    }
  } else {
    const filePath = path.join(process.env.VERCEL || process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data"), "exam_rules.json");
    if (!fs.existsSync(filePath)) return { rules: {}, sessionLimits: {} };
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (data.rules && data.sessionLimits) {
        return data as ExamSettings;
      } else {
        const rules: Record<string, string> = {};
        const sessionLimits: Record<string, number> = {};
        Object.keys(data).forEach(k => {
          rules[k] = data[k];
          sessionLimits[k] = 1;
        });
        return { rules, sessionLimits };
      }
    } catch (e) {
      return { rules: {}, sessionLimits: {} };
    }
  }
}

export async function writeRule(examType: string, rule?: string, sessionLimit?: number): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      if (rule !== undefined) {
        await client.query(
          "INSERT INTO vit_exam_rules (exam_type, rule) VALUES ($1, $2) ON CONFLICT (exam_type) DO UPDATE SET rule = $2",
          [examType, rule]
        );
      }
      if (sessionLimit !== undefined) {
        await client.query(
          "INSERT INTO vit_exam_rules (exam_type, rule, session_limit) VALUES ($1, '1', $2) ON CONFLICT (exam_type) DO UPDATE SET session_limit = $2",
          [examType, sessionLimit]
        );
      }
    } finally {
      client.release();
    }
  } else {
    const settings = await readRules();
    if (rule !== undefined) {
      settings.rules[examType] = rule;
    }
    if (sessionLimit !== undefined) {
      settings.sessionLimits[examType] = sessionLimit;
    }
    const filePath = path.join(process.env.VERCEL || process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data"), "exam_rules.json");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf8");
  }
}

export async function logDownload(platform: string): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("INSERT INTO vit_downloads (platform) VALUES ($1)", [platform]);
    } finally {
      client.release();
    }
  } else {
    const filePath = path.join(process.env.VERCEL || process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data"), "telemetry.json");
    let data: any = { downloads: [], heartbeats: [], events: [] };
    if (fs.existsSync(filePath)) {
      try { data = JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (e) {}
    }
    if (!data.downloads) data.downloads = [];
    data.downloads.push({ platform, timestamp: new Date().toISOString() });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  }
}

export async function logHeartbeat(uuid: string, platform: string, appVersion: string): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("INSERT INTO vit_heartbeats (uuid, platform, app_version) VALUES ($1, $2, $3)", [uuid, platform, appVersion]);
    } finally {
      client.release();
    }
  } else {
    const filePath = path.join(process.env.VERCEL || process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data"), "telemetry.json");
    let data: any = { downloads: [], heartbeats: [], events: [] };
    if (fs.existsSync(filePath)) {
      try { data = JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (e) {}
    }
    if (!data.heartbeats) data.heartbeats = [];
    data.heartbeats.push({ uuid, platform, appVersion, timestamp: new Date().toISOString() });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  }
}

export async function logTelemetryEvent(uuid: string, event: string): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("INSERT INTO vit_telemetry_events (uuid, event) VALUES ($1, $2)", [uuid, event]);
    } finally {
      client.release();
    }
  } else {
    const filePath = path.join(process.env.VERCEL || process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data"), "telemetry.json");
    let data: any = { downloads: [], heartbeats: [], events: [] };
    if (fs.existsSync(filePath)) {
      try { data = JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (e) {}
    }
    if (!data.events) data.events = [];
    data.events.push({ uuid, event, timestamp: new Date().toISOString() });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  }
}

export async function getTelemetryMetrics(): Promise<any> {
  let downloads: any[] = [];
  let heartbeats: any[] = [];
  let events: any[] = [];

  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      const dlRes = await client.query("SELECT * FROM vit_downloads");
      downloads = dlRes.rows;
      const hbRes = await client.query("SELECT * FROM vit_heartbeats");
      heartbeats = hbRes.rows.map(r => ({ ...r, appVersion: r.app_version }));
      const evRes = await client.query("SELECT * FROM vit_telemetry_events");
      events = evRes.rows;
    } catch (e) {
      console.error("Error reading telemetry from Postgres:", e);
    } finally {
      client.release();
    }
  } else {
    const filePath = path.join(process.env.VERCEL || process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data"), "telemetry.json");
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        downloads = data.downloads || [];
        heartbeats = data.heartbeats || [];
        events = data.events || [];
      } catch (e) {}
    }
  }

  return { downloads, heartbeats, events };
}

export async function clearTelemetryData(): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("DELETE FROM vit_downloads");
      await client.query("DELETE FROM vit_heartbeats");
      await client.query("DELETE FROM vit_telemetry_events");
    } finally {
      client.release();
    }
  } else {
    const filePath = path.join(process.env.VERCEL || process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data"), "telemetry.json");
    if (fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, JSON.stringify({ downloads: [], heartbeats: [], events: [] }, null, 2), "utf8");
      } catch (e) {}
    }
  }
}

export async function logAudit(event: string, username: string, ip: string, status: "success" | "failed" | "warning"): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        "INSERT INTO vit_audit_logs (event, username, ip, status) VALUES ($1, $2, $3, $4)",
        [event, username, ip, status]
      );
    } finally {
      client.release();
    }
  } else {
    const filePath = path.join(process.env.VERCEL || process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data"), "audit_logs.json");
    let logs: any[] = [];
    if (fs.existsSync(filePath)) {
      try { logs = JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (e) {}
    }
    if (!Array.isArray(logs)) logs = [];
    logs.unshift({
      id: String(100 + logs.length + 1),
      event,
      user: username,
      ip,
      status,
      timestamp: new Date().toISOString()
    });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(logs, null, 2), "utf8");
  }
}

export async function getAuditLogs(): Promise<any[]> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      const res = await client.query("SELECT * FROM vit_audit_logs ORDER BY timestamp DESC, id DESC");
      return res.rows.map(r => ({
        id: String(r.id),
        event: r.event,
        user: r.username,
        ip: r.ip,
        status: r.status,
        timestamp: new Date(r.timestamp).toISOString()
      }));
    } catch (e) {
      console.error("Error reading audit logs:", e);
      return [];
    } finally {
      client.release();
    }
  } else {
    const filePath = path.join(process.env.VERCEL || process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data"), "audit_logs.json");
    if (!fs.existsSync(filePath)) {
      const defaultLogs = [
        { id: "101", timestamp: new Date(Date.now() - 3600000).toISOString(), event: "Admin Session Terminated", user: "Nithin", ip: "192.168.1.15", status: "success" },
        { id: "102", timestamp: new Date(Date.now() - 7200000).toISOString(), event: "Failed Auth Attempt", user: "Unknown", ip: "198.51.100.42", status: "failed" },
        { id: "103", timestamp: new Date(Date.now() - 10800000).toISOString(), event: "VIT Database Modified", user: "Nithin", ip: "10.251.103.162", status: "warning" },
        { id: "104", timestamp: new Date(Date.now() - 14400000).toISOString(), event: "SSL Handshake Verified", user: "System", ip: "127.0.0.1", status: "success" },
      ];
      return defaultLogs;
    }
    try {
      const logs = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (Array.isArray(logs)) {
        return logs.map(l => ({
          id: String(l.id),
          event: l.event,
          user: l.user || l.username,
          ip: l.ip,
          status: l.status,
          timestamp: l.timestamp ? new Date(l.timestamp).toISOString() : new Date().toISOString()
        }));
      }
    } catch (e) {}
    return [];
  }
}

export async function getDiagnosticsData(): Promise<any> {
  const isPostgres = !!process.env.DATABASE_URL;
  let dbStatus = "Disconnected";
  let dbLatency = 0;
  let sessionsCount = 0;
  let questionsCount = 0;
  let heartbeatsCount = 0;
  let downloadsCount = 0;

  const start = Date.now();
  if (pool) {
    try {
      const client = await pool.connect();
      await client.query("SELECT NOW()");
      dbLatency = Date.now() - start;
      dbStatus = "Connected (PostgreSQL Live)";

      const sRes = await client.query("SELECT COUNT(*) FROM vit_sessions");
      sessionsCount = parseInt(sRes.rows[0].count, 10);

      const qRes = await client.query("SELECT COUNT(*) FROM vit_questions");
      questionsCount = parseInt(qRes.rows[0].count, 10);

      const hRes = await client.query("SELECT COUNT(*) FROM vit_heartbeats");
      heartbeatsCount = parseInt(hRes.rows[0].count, 10);

      const dRes = await client.query("SELECT COUNT(*) FROM vit_downloads");
      downloadsCount = parseInt(dRes.rows[0].count, 10);

      client.release();
    } catch (e: any) {
      dbStatus = `Error: ${e.message}`;
    }
  } else {
    dbStatus = "Connected (Local JSON Database)";
    try {
      const codes = await readCodes(true);
      sessionsCount = codes.length;
      questionsCount = codes.reduce((a, s) => a + (s.questions?.length || 0), 0);
    } catch (e) {}
  }

  const memory = process.memoryUsage();

  return {
    database: {
      status: dbStatus,
      latency: dbLatency,
      sessionsCount,
      questionsCount,
      heartbeatsCount,
      downloadsCount
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryHeapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      memoryHeapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      serverTime: new Date().toISOString()
    }
  };
}

const getMonetizationJsonPath = () => {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
  return path.join(baseDir, "monetization.json");
};

async function readMonetization(): Promise<{ subscriptions: any[], coupons: any[] }> {
  const filePath = getMonetizationJsonPath();
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const defaults = {
        subscriptions: [
          { id: "TXN_001", email: "student1@vitap.ac.in", plan: "Monthly Pass", amount: "₹99", status: "success", date: "2026-06-14 10:15" },
          { id: "TXN_002", email: "student2@vitap.ac.in", plan: "Yearly Pass", amount: "₹499", status: "success", date: "2026-06-14 09:30" },
          { id: "TXN_003", email: "student3@vitstudent.ac.in", plan: "Monthly Pass", amount: "₹99", status: "failed", date: "2026-06-13 18:45" },
          { id: "TXN_004", email: "student4@vit.ac.in", plan: "Semester Pass", amount: "₹249", status: "success", date: "2026-06-13 14:20" },
        ],
        coupons: [
          { code: "VITAP50", discount: "50%", usage: 42, status: "active" },
          { code: "FREEWEEK", discount: "100%", usage: 118, status: "active" },
          { code: "WELCOME10", discount: "20%", usage: 5, status: "expired" },
        ]
      };
      fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2), "utf8");
      return defaults;
    }
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return { subscriptions: [], coupons: [] };
  }
}

async function writeMonetization(data: { subscriptions: any[], coupons: any[] }) {
  const filePath = getMonetizationJsonPath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {}
}

export async function getSubscriptions(): Promise<any[]> {
  if (pool) {
    try {
      const res = await pool.query("SELECT * FROM vit_subscriptions ORDER BY date DESC");
      return res.rows;
    } catch (e) {
      console.error(e);
      return [];
    }
  } else {
    const data = await readMonetization();
    return data.subscriptions;
  }
}

export async function getCoupons(): Promise<any[]> {
  if (pool) {
    try {
      const res = await pool.query("SELECT * FROM vit_coupons ORDER BY code ASC");
      return res.rows;
    } catch (e) {
      console.error(e);
      return [];
    }
  } else {
    const data = await readMonetization();
    return data.coupons;
  }
}

export async function addSubscription(txn: any): Promise<void> {
  if (pool) {
    await pool.query(
      "INSERT INTO vit_subscriptions (id, email, plan, amount, status, date) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, plan = EXCLUDED.plan, amount = EXCLUDED.amount, status = EXCLUDED.status, date = EXCLUDED.date",
      [txn.id, txn.email, txn.plan, txn.amount, txn.status, txn.date]
    );
  } else {
    const data = await readMonetization();
    data.subscriptions = [txn, ...data.subscriptions.filter((s: any) => s.id !== txn.id)];
    await writeMonetization(data);
  }
}

export async function deleteSubscription(id: string): Promise<void> {
  if (pool) {
    await pool.query("DELETE FROM vit_subscriptions WHERE id = $1", [id]);
  } else {
    const data = await readMonetization();
    data.subscriptions = data.subscriptions.filter((s: any) => s.id !== id);
    await writeMonetization(data);
  }
}

export async function addCoupon(coupon: any): Promise<void> {
  if (pool) {
    await pool.query(
      "INSERT INTO vit_coupons (code, discount, usage, status) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO UPDATE SET discount = EXCLUDED.discount, usage = EXCLUDED.usage, status = EXCLUDED.status",
      [coupon.code, coupon.discount, coupon.usage || 0, coupon.status || 'active']
    );
  } else {
    const data = await readMonetization();
    data.coupons = [coupon, ...data.coupons.filter((c: any) => c.code !== coupon.code)];
    await writeMonetization(data);
  }
}

export async function toggleCoupon(code: string): Promise<void> {
  if (pool) {
    await pool.query("UPDATE vit_coupons SET status = CASE WHEN status = 'active' THEN 'expired' ELSE 'active' END WHERE code = $1", [code]);
  } else {
    const data = await readMonetization();
    data.coupons = data.coupons.map((c: any) => c.code === code ? { ...c, status: c.status === "active" ? "expired" : "active" } : c);
    await writeMonetization(data);
  }
}

export async function deleteCoupon(code: string): Promise<void> {
  if (pool) {
    await pool.query("DELETE FROM vit_coupons WHERE code = $1", [code]);
  } else {
    const data = await readMonetization();
    data.coupons = data.coupons.filter((c: any) => c.code !== code);
    await writeMonetization(data);
  }
}

const getUsersJsonPath = () => {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
  return path.join(baseDir, "users_rbac.json");
};

async function readUsersRbac(): Promise<{ users: any[], rbac: any }> {
  const filePath = getUsersJsonPath();
  try {
    if (!fs.existsSync(filePath)) {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
      fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2), "utf8");
      return defaults;
    }
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return { users: [], rbac: {} };
  }
}

async function writeUsersRbac(data: { users: any[], rbac: any }) {
  const filePath = getUsersJsonPath();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {}
}

export async function getDbUsers(): Promise<any[]> {
  if (pool) {
    try {
      const res = await pool.query('SELECT id, name, email, role, status, verified, activity, joined_date as "joinedDate", active_devices as "activeDevices", premium, password FROM vit_users ORDER BY id ASC');
      return res.rows;
    } catch (e) {
      console.error(e);
      return [];
    }
  } else {
    const data = await readUsersRbac();
    return data.users;
  }
}

export async function getDbRbac(): Promise<any> {
  if (pool) {
    try {
      const res = await pool.query("SELECT * FROM vit_rbac");
      const rbac: any = {};
      res.rows.forEach((row: any) => {
        rbac[row.role] = JSON.parse(row.permissions);
      });
      return rbac;
    } catch (e) {
      console.error(e);
      return {};
    }
  } else {
    const data = await readUsersRbac();
    return data.rbac;
  }
}

export async function updateDbUser(user: any): Promise<void> {
  if (pool) {
    await pool.query(
      "INSERT INTO vit_users (id, name, email, role, status, verified, activity, joined_date, active_devices, premium, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role, status = EXCLUDED.status, verified = EXCLUDED.verified, activity = EXCLUDED.activity, joined_date = EXCLUDED.joined_date, active_devices = EXCLUDED.active_devices, premium = EXCLUDED.premium, password = EXCLUDED.password",
      [user.id, user.name, user.email, user.role, user.status, user.verified, user.activity, user.joinedDate, user.activeDevices, user.premium, user.password || 'check']
    );
  } else {
    const data = await readUsersRbac();
    data.users = data.users.map((u: any) => u.id === user.id ? user : u);
    await writeUsersRbac(data);
  }
}

export async function deleteDbUser(id: string): Promise<void> {
  if (pool) {
    await pool.query("DELETE FROM vit_users WHERE id = $1", [id]);
  } else {
    const data = await readUsersRbac();
    data.users = data.users.filter((u: any) => u.id !== id);
    await writeUsersRbac(data);
  }
}

export async function updateDbRbac(role: string, permissions: any): Promise<void> {
  if (pool) {
    await pool.query(
      "INSERT INTO vit_rbac (role, permissions) VALUES ($1, $2) ON CONFLICT (role) DO UPDATE SET permissions = EXCLUDED.permissions",
      [role, JSON.stringify(permissions)]
    );
  } else {
    const data = await readUsersRbac();
    data.rbac[role] = permissions;
    await writeUsersRbac(data);
  }
}


// ─── Monetization & License Keys Operations ───

const getMonetizationSettingsPath = () => {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
  return path.join(baseDir, "monetization_settings.json");
};

const getLicensesJsonPath = () => {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
  return path.join(baseDir, "licenses.json");
};

export async function getMonetizationSettings(): Promise<any> {
  let settings: any = null;
  if (pool) {
    await initDb();
    const res = await pool.query("SELECT value FROM vit_settings WHERE key = 'monetization_settings'");
    if (res.rows.length > 0) {
      settings = JSON.parse(res.rows[0].value);
    }
  }
  if (!settings) {
    const filePath = getMonetizationSettingsPath();
    if (fs.existsSync(filePath)) {
      try {
        settings = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (e) {}
    }
  }
  if (!settings) {
    settings = {
      monetization_enabled: false,
      free_enabled: false,
      plans: [
        {
          tier: "Free",
          title: "Free Pass",
          subtitle: "Basic access limits",
          price: "₹0",
          validity_days: 365,
          max_sessions: 999,
          max_vitcodes: 999,
          allow_live_sync: 0,
          allow_typing: 0,
          allow_typing_mode: 0,
          allow_inject: 0,
          allow_raw: 0,
          allow_select_copy: 0,
          allow_fetch: 0,
          allow_refill: 0,
          allow_vitcode: 0,
          allow_tunnel: -1
        },
        { tier: "Basic", title: "Week Pass", subtitle: "Perfect for exam weeks", price: "₹39", validity_days: 7, allow_tunnel: -1 },
        { tier: "Pro", title: "Monthly Pass", subtitle: "Consistent connectivity", price: "₹99", validity_days: 30, allow_tunnel: 0 },
        { tier: "Max", title: "Sem Pass", subtitle: "Semester companion", price: "₹299", validity_days: 120, allow_tunnel: 0 },
        { tier: "Ultra", title: "Yearly Pass", subtitle: "Year-round connectivity", price: "₹499", validity_days: 365, allow_tunnel: 0 }
      ]
    };
  } else {
    if (settings.free_enabled === undefined) {
      settings.free_enabled = false;
    }
    if (!settings.plans) {
      settings.plans = [];
    }
    const hasFree = settings.plans.some((p: any) => p.tier === "Free");
    if (!hasFree) {
      settings.plans.unshift({
        tier: "Free",
        title: "Free Pass",
        subtitle: "Basic access limits",
        price: "₹0",
        validity_days: 365,
        max_sessions: 999,
        max_vitcodes: 999,
        allow_live_sync: 0,
        allow_typing: 0,
        allow_typing_mode: 0,
        allow_inject: 0,
        allow_raw: 0,
        allow_select_copy: 0,
        allow_fetch: 0,
        allow_refill: 0,
        allow_vitcode: 0,
        allow_tunnel: -1
      });
    }
    // Backward compatibility check for other plans lacking allow_tunnel
    settings.plans.forEach((plan: any) => {
      if (plan.allow_tunnel === undefined) {
        plan.allow_tunnel = (plan.tier === "Basic" || plan.tier === "Free") ? -1 : 0;
      }
    });
  }
  return settings;
}

export async function setMonetizationSettings(settings: any): Promise<void> {
  if (pool) {
    await initDb();
    await pool.query(
      "INSERT INTO vit_settings (key, value) VALUES ('monetization_settings', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [JSON.stringify(settings)]
    );
  }
  const filePath = getMonetizationSettingsPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf8");
}

export async function verifyLicenseKey(key: string, hwid?: string): Promise<any> {
  const cleanKey = key.trim().toUpperCase();
  const cleanHwid = hwid ? hwid.trim().toUpperCase() : null;

  if (pool) {
    try {
      await initDb();
      const res = await pool.query("SELECT * FROM vit_licenses WHERE UPPER(key) = $1", [cleanKey]);
      if (res.rows.length > 0) {
        const lic = res.rows[0];
        const expiry = new Date(lic.expires_at).getTime();
        const now = Date.now();
        if (now >= expiry) {
          return { valid: false, error: "License key has expired." };
        }

        // HWID lock logic
        const dbHwid = lic.hwid ? lic.hwid.trim().toUpperCase() : null;
        if (!dbHwid) {
          // First-time activation: bind the HWID
          if (cleanHwid) {
            await pool.query("UPDATE vit_licenses SET hwid = $1 WHERE UPPER(key) = $2", [cleanHwid, cleanKey]);
            return { valid: true, tier: lic.tier, expires_at: lic.expires_at };
          } else {
            // No HWID passed and not bound yet: let it pass but don't bind (e.g. API checks)
            return { valid: true, tier: lic.tier, expires_at: lic.expires_at };
          }
        } else {
          // Key is already bound to a hardware ID
          if (cleanHwid === dbHwid) {
            return { valid: true, tier: lic.tier, expires_at: lic.expires_at };
          } else {
            return { valid: false, error: "License is already bound to another device." };
          }
        }
      }
      return { valid: false, error: "License key not found." };
    } catch (e) {
      console.error("DB verifyLicenseKey error, falling back to JSON:", e);
    }
  }

  // Fallback JSON mode
  const filePath = getLicensesJsonPath();
  if (fs.existsSync(filePath)) {
    try {
      const licenses = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const matchingKey = Object.keys(licenses).find(k => k.trim().toUpperCase() === cleanKey);
      if (matchingKey) {
        const lic = licenses[matchingKey];
        const expiry = new Date(lic.expires_at).getTime();
        const now = Date.now();
        if (now >= expiry) {
          return { valid: false, error: "License key has expired." };
        }

        const dbHwid = lic.hwid ? lic.hwid.trim().toUpperCase() : null;
        if (!dbHwid) {
          if (cleanHwid) {
            licenses[matchingKey].hwid = cleanHwid;
            fs.writeFileSync(filePath, JSON.stringify(licenses, null, 2), "utf8");
            return { valid: true, tier: lic.tier, expires_at: lic.expires_at };
          } else {
            return { valid: true, tier: lic.tier, expires_at: lic.expires_at };
          }
        } else {
          if (cleanHwid === dbHwid) {
            return { valid: true, tier: lic.tier, expires_at: lic.expires_at };
          } else {
            return { valid: false, error: "License is already bound to another device." };
          }
        }
      }
    } catch (e) {}
  }
  return { valid: false, error: "License key not found." };
}

export async function resetLicenseHwid(key: string): Promise<void> {
  const cleanKey = key.trim().toUpperCase();
  if (pool) {
    await initDb();
    await pool.query("UPDATE vit_licenses SET hwid = NULL WHERE UPPER(key) = $1", [cleanKey]);
    return;
  }

  const filePath = getLicensesJsonPath();
  if (fs.existsSync(filePath)) {
    try {
      const licenses = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const matchingKey = Object.keys(licenses).find(k => k.trim().toUpperCase() === cleanKey);
      if (matchingKey) {
        licenses[matchingKey].hwid = null;
        fs.writeFileSync(filePath, JSON.stringify(licenses, null, 2), "utf8");
      }
    } catch (e) {}
  }
}


export async function generateLicenseKey(tier: string, email: string, durationDays: number): Promise<string> {
  const generatedKey = `LP-${tier.toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  
  if (pool) {
    await initDb();
    await pool.query(
      "INSERT INTO vit_licenses (key, tier, email, expires_at) VALUES ($1, $2, $3, $4)",
      [generatedKey, tier, email, expiresAt]
    );
    return generatedKey;
  }
  
  const filePath = getLicensesJsonPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  let licenses: any = {};
  if (fs.existsSync(filePath)) {
    try {
      licenses = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (e) {}
  }
  licenses[generatedKey] = { tier, email, expires_at: expiresAt, created_at: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(licenses, null, 2), "utf8");
  return generatedKey;
}

export async function deleteLicense(key: string): Promise<void> {
  if (pool) {
    await initDb();
    await pool.query("DELETE FROM vit_licenses WHERE key = $1", [key]);
    return;
  }
  const filePath = getLicensesJsonPath();
  if (fs.existsSync(filePath)) {
    try {
      const licenses = JSON.parse(fs.readFileSync(filePath, "utf8"));
      delete licenses[key];
      fs.writeFileSync(filePath, JSON.stringify(licenses, null, 2), "utf8");
    } catch (e) {}
  }
}

export async function getAllLicenses(): Promise<any[]> {
  if (pool) {
    await initDb();
    const res = await pool.query("SELECT * FROM vit_licenses ORDER BY created_at DESC");
    return res.rows;
  }
  const filePath = getLicensesJsonPath();
  if (fs.existsSync(filePath)) {
    try {
      const licenses = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return Object.entries(licenses).map(([key, value]: [string, any]) => ({
        key,
        ...value
      })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (e) {}
  }
  return [];
}

export async function getOtaFile(file: string): Promise<string | null> {
  if (pool) {
    await initDb();
    const res = await pool.query("SELECT value FROM vit_settings WHERE key = $1", [`ota_file:${file}`]);
    if (res.rows.length > 0) {
      return res.rows[0].value;
    }
  }
  return null;
}

export async function setOtaFile(file: string, content: string): Promise<void> {
  if (pool) {
    await initDb();
    await pool.query(
      "INSERT INTO vit_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [`ota_file:${file}`, content]
    );
  }
}

