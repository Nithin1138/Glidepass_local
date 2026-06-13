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
            "INSERT INTO vit_questions (id, session_id, title, code, language, comment, contributor_email, contributor_name, contributor_regno, contributor_college, is_deleted) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
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
              q.isDeleted || false
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

export async function updateQuestion(q: Question): Promise<void> {
  if (await isQuestionLocked(q.id)) {
    throw new Error("This question is locked by an admin and cannot be modified.");
  }
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        "UPDATE vit_questions SET title = $2, code = $3, language = $4, comment = $5, is_deleted = $6 WHERE id = $1",
        [q.id, q.title, q.code, q.language, q.comment || null, q.isDeleted || false]
      );
    } finally {
      client.release();
    }
  } else {
    const all = await readCodes(true);
    for (const s of all) {
      const idx = (s.questions || []).findIndex(x => x.id === q.id);
      if (idx !== -1) {
        s.questions[idx] = {
          ...q,
          isDeleted: q.isDeleted !== undefined ? q.isDeleted : s.questions[idx].isDeleted
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
