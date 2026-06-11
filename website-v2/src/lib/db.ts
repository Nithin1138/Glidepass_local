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

// Initialize Postgres tables
export async function initDb() {
  if (!pool || isDbInitialized) return;
  const client = await pool.connect();
  try {
    // We will drop existing tables to recreate them with the correct schema
    await client.query("DROP TABLE IF EXISTS vit_questions CASCADE;");
    await client.query("DROP TABLE IF EXISTS vit_sessions CASCADE;");

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
        contributor_email TEXT
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_contributors (
        email TEXT PRIMARY KEY,
        status TEXT DEFAULT 'active'
      );
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
}

export interface VitCode {
  id: string;
  date: string;
  examType: string;
  title?: string;
  questions: Question[];
}

export async function readCodes(): Promise<VitCode[]> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      // Fetch all sessions
      const sessionsRes = await client.query("SELECT * FROM vit_sessions ORDER BY date DESC, id DESC");
      // Fetch all questions
      const questionsRes = await client.query("SELECT * FROM vit_questions");
      
      const questionsBySession: Record<string, Question[]> = {};
      questionsRes.rows.forEach((row) => {
        const q: Question = {
          id: row.id,
          title: row.title,
          code: row.code,
          language: row.language,
          comment: row.comment,
          contributorEmail: row.contributor_email,
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
        return JSON.parse(fs.readFileSync(defaultFilePath, "utf8"));
      } catch (e) {}
    }
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
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
          "INSERT INTO vit_sessions (id, date, exam_type, title) VALUES ($1, $2, $3, $4)",
          [session.id, session.date, session.examType, session.title || null]
        );

        for (const q of session.questions) {
          await client.query(
            "INSERT INTO vit_questions (id, session_id, title, code, language, comment, contributor_email) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [q.id, session.id, q.title, q.code, q.language, q.comment || null, q.contributorEmail || null]
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
        "INSERT INTO vit_sessions (id, date, exam_type, title) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET date=$2, exam_type=$3, title=$4",
        [session.id, session.date, session.examType, session.title || null]
      );
    } finally {
      client.release();
    }
  } else {
    // JSON fallback
    const all = await readCodes();
    all.unshift(session);
    await writeCodes(all);
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
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
    const all = await readCodes();
    const filtered = all.filter(s => s.id !== sessionId);
    await writeCodes(filtered);
  }
}

export async function createQuestion(sessionId: string, q: Question): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        "INSERT INTO vit_questions (id, session_id, title, code, language, comment, contributor_email) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [q.id, sessionId, q.title, q.code, q.language, q.comment || null, q.contributorEmail || null]
      );
    } finally {
      client.release();
    }
  } else {
    // JSON fallback
    const all = await readCodes();
    const s = all.find(s => s.id === sessionId);
    if (s) {
      if (!s.questions) s.questions = [];
      s.questions.push(q);
      await writeCodes(all);
    }
  }
}

export async function updateQuestion(q: Question): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        "UPDATE vit_questions SET title = $2, code = $3, language = $4, comment = $5 WHERE id = $1",
        [q.id, q.title, q.code, q.language, q.comment || null]
      );
    } finally {
      client.release();
    }
  } else {
    const all = await readCodes();
    for (const s of all) {
      const idx = (s.questions || []).findIndex(x => x.id === q.id);
      if (idx !== -1) {
        s.questions[idx] = q;
        await writeCodes(all);
        return;
      }
    }
  }
}

export async function deleteQuestion(qId: string): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("DELETE FROM vit_questions WHERE id = $1", [qId]);
    } finally {
      client.release();
    }
  } else {
    const all = await readCodes();
    for (const s of all) {
      s.questions = (s.questions || []).filter(q => q.id !== qId);
    }
    await writeCodes(all);
  }
}
