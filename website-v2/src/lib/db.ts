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
    // Production pooling configurations
    max: 20, // Keep active client connections limited to manage serverless connection ceilings
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds to release pooled connections
    connectionTimeoutMillis: 5000, // Error out if connection cannot be made in 5 seconds
    maxUses: 7500, // Recreate connection after 7500 queries to prevent memory leaks in long-running servers
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

const globalCache = globalThis as unknown as {
  cachedHubs?: Hub[];
  cachedHubsTime?: number;
  cachedResources?: Resource[];
  cachedResourcesTime?: number;
};

// Helper to invalidate read caches on any writes
export function invalidateCache() {
  globalCache.cachedHubs = undefined;
  globalCache.cachedHubsTime = undefined;
  globalCache.cachedResources = undefined;
  globalCache.cachedResourcesTime = undefined;
}

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
      CREATE TABLE IF NOT EXISTS vit_resources (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        language TEXT,
        tags TEXT DEFAULT '[]',
        content TEXT NOT NULL,
        description TEXT,
        views INTEGER DEFAULT 0,
        copies INTEGER DEFAULT 0,
        sends INTEGER DEFAULT 0,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        creator_email TEXT,
        creator_name TEXT,
        hub_id TEXT,
        sub_category TEXT,
        category TEXT,
        topic TEXT,
        is_locked BOOLEAN DEFAULT false
      );
    `);

    // Alter table to add columns if they don't exist in existing database schemas
    const checkColumns = [
      { name: "hub_id", type: "TEXT" },
      { name: "sub_category", type: "TEXT" },
      { name: "category", type: "TEXT" },
      { name: "topic", type: "TEXT" },
      { name: "is_locked", type: "BOOLEAN DEFAULT false" },
      { name: "description", type: "TEXT" }
    ];
    for (const col of checkColumns) {
      try {
        await client.query(`ALTER TABLE vit_resources ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      } catch (e) {
        console.error(`Failed to add column ${col.name}:`, e);
      }
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_collections (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        creator_email TEXT
      );
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
      ALTER TABLE vit_users ADD COLUMN IF NOT EXISTS consent_emails BOOLEAN DEFAULT false;
      ALTER TABLE vit_users ADD COLUMN IF NOT EXISTS referral TEXT DEFAULT NULL;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_rbac (
        role TEXT PRIMARY KEY,
        permissions TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_referrals (
        id SERIAL PRIMARY KEY,
        referrer_email TEXT NOT NULL,
        referred_email TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_referrer_codes (
        email TEXT PRIMARY KEY,
        referral_code TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query("ALTER TABLE vit_coupons ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;");
    await client.query("ALTER TABLE vit_coupons ADD COLUMN IF NOT EXISTS max_uses INT DEFAULT 100;");

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

    // Subscriptions seeding omitted to work in real-time

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

    // Initialize Reports Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_reports (
        id TEXT PRIMARY KEY,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        details TEXT,
        reporter_contact TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        reporter_ip TEXT
      );
    `);


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
        free_enabled: true,
        plans: [
          {
            tier: "Free",
            title: "Free Pass",
            subtitle: "Basic local bridging",
            price: "₹0",
            validity_days: 365,
            max_sessions: 5,
            max_resources_per_month: 5,
            allow_live_sync: 0,
            allow_typing: 0,
            allow_typing_mode: 0,
            allow_inject: 0,
            allow_raw: 1,
            allow_select_copy: 0,
            allow_fetch: 0,
            allow_refill: 0,
            allow_resource_access: 1,
            allow_resource_analytics: 0,
            allow_tunnel: -1
          },
          {
            tier: "Pro",
            title: "Pro Pass",
            subtitle: "Full power for local builders",
            price: "₹99",
            validity_days: 30,
            max_sessions: 999,
            max_resources_per_month: 100,
            allow_live_sync: 1,
            allow_typing: 1,
            allow_typing_mode: 1,
            allow_inject: 1,
            allow_raw: 1,
            allow_select_copy: 1,
            allow_fetch: 1,
            allow_refill: 1,
            allow_resource_access: 1,
            allow_resource_analytics: 0,
            allow_tunnel: 1
          },
          {
            tier: "Creator",
            title: "Creator Pass",
            subtitle: "Publishing and analytics",
            price: "₹299",
            validity_days: 120,
            max_sessions: 999,
            max_resources_per_month: 9999,
            allow_live_sync: 1,
            allow_typing: 1,
            allow_typing_mode: 1,
            allow_inject: 1,
            allow_raw: 1,
            allow_select_copy: 1,
            allow_fetch: 1,
            allow_refill: 1,
            allow_resource_access: 1,
            allow_resource_analytics: 1,
            allow_tunnel: 1
          }
        ]
      };
      await client.query("INSERT INTO vit_settings (key, value) VALUES ('monetization_settings', $1)", [JSON.stringify(defaultSettings)]);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS hubs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        creator_email TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT false,
        visibility TEXT DEFAULT 'public',
        allowed_types TEXT DEFAULT '["code","link","text"]',
        sub_categories TEXT DEFAULT '[]'
      );
    `);

    try {
      await client.query("ALTER TABLE hubs ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';");
      await client.query("ALTER TABLE hubs ADD COLUMN IF NOT EXISTS allowed_types TEXT DEFAULT '[\"code\",\"link\",\"text\"]';");
      await client.query("ALTER TABLE hubs ADD COLUMN IF NOT EXISTS sub_categories TEXT DEFAULT '[]';");
    } catch (e) {
      console.error("Failed to add columns to hubs:", e);
    }


    await client.query(`
      CREATE TABLE IF NOT EXISTS hub_contributors (
        id SERIAL PRIMARY KEY,
        hub_id TEXT NOT NULL,
        contributor_email TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(hub_id, contributor_email)
      );
    `);

    try {
      await client.query("ALTER TABLE vit_resources ADD COLUMN IF NOT EXISTS hub_id TEXT DEFAULT NULL;");
      await client.query("ALTER TABLE vit_resources ADD COLUMN IF NOT EXISTS sub_category TEXT DEFAULT NULL;");
      await client.query("ALTER TABLE vit_resources ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;");
    } catch (e) {
      console.error("Failed to add columns to vit_resources:", e);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_clipboard_rooms (
        code TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMPTZ NOT NULL,
        duration_mins INTEGER NOT NULL,
        allow_all_members_to_add BOOLEAN DEFAULT true,
        host_session_id TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_clipboard_items (
        id TEXT PRIMARY KEY,
        room_code TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_clipboard_active_users (
        room_code TEXT NOT NULL,
        session_id TEXT NOT NULL,
        last_active TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (room_code, session_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vit_clipboard_file_chunks (
        upload_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_data TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (upload_id, chunk_index)
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

export interface TopicConfig {
  name: string;
  limit?: number;
}

export interface CategoryConfig {
  name: string;
  allowedTypes?: string[];
  limit?: number;
  topics?: TopicConfig[];
  topicsLimit?: number;
  dailyLimit?: number;
}

export interface Resource {
  id: string;
  title: string;
  type: string;
  language?: string;
  tags: string[];
  content: string;
  description?: string;
  views: number;
  copies: number;
  sends: number;
  isDeleted: boolean;
  isLocked?: boolean;
  createdAt?: string;
  creatorEmail?: string;
  creatorName?: string;
  hubId?: string;
  subCategory?: string;
  category?: string;
  topic?: string;
}

export interface Collection {
  id: string;
  title: string;
  description?: string;
  isDeleted: boolean;
  createdAt?: string;
  creatorEmail?: string;
}

const getResourcesJsonPath = () => {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
  return path.join(baseDir, "resources.json");
};

const getCollectionsJsonPath = () => {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
  return path.join(baseDir, "collections.json");
};

export async function readResources(includeDeleted = false): Promise<Resource[]> {
  const now = Date.now();
  if (pool) {
    if (globalCache.cachedResources && globalCache.cachedResourcesTime && (now - globalCache.cachedResourcesTime < 5000)) {
      return includeDeleted ? globalCache.cachedResources : globalCache.cachedResources.filter(r => !r.isDeleted);
    }
    await initDb();
    const client = await pool.connect();
    try {
      const query = "SELECT * FROM vit_resources ORDER BY created_at DESC";
      const res = await client.query(query);
      const rows = res.rows.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        language: row.language || undefined,
        tags: typeof row.tags === "string" ? JSON.parse(row.tags) : (Array.isArray(row.tags) ? row.tags : []),
        content: row.content,
        views: row.views || 0,
        copies: row.copies || 0,
        sends: row.sends || 0,
        isDeleted: !!row.is_deleted,
        isLocked: !!row.is_locked,
        description: row.description || undefined,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        creatorEmail: row.creator_email || undefined,
        creatorName: row.creator_name || undefined,
        hubId: row.hub_id || undefined,
        subCategory: row.sub_category || undefined,
        category: row.category || undefined,
        topic: row.topic || undefined,
      }));
      globalCache.cachedResources = rows;
      globalCache.cachedResourcesTime = now;
      return includeDeleted ? rows : rows.filter(r => !r.isDeleted);
    } catch (error) {
      console.error("Error reading resources from Postgres:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  const filePath = getResourcesJsonPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      const items = data.map((item: any) => ({
        ...item,
        tags: Array.isArray(item.tags) ? item.tags : [],
        views: item.views || 0,
        copies: item.copies || 0,
        sends: item.sends || 0,
        isDeleted: !!item.isDeleted,
        isLocked: !!item.isLocked,
        hubId: item.hubId || undefined,
        subCategory: item.subCategory || undefined,
        category: item.category || undefined,
        topic: item.topic || undefined,
      }));
      if (includeDeleted) return items;
      return items.filter((item: any) => !item.isDeleted);
    }
    return [];
  } catch (error) {
    return [];
  }
}

export async function writeResources(data: Resource[]): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM vit_resources");
      for (const item of data) {
        await client.query(
          `INSERT INTO vit_resources (id, title, type, language, tags, content, views, copies, sends, is_deleted, creator_email, creator_name, hub_id, sub_category, category, topic, is_locked) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            item.id,
            item.title,
            item.type,
            item.language || null,
            item.tags ? (typeof item.tags === "string" ? item.tags : JSON.stringify(item.tags)) : "[]",
            item.content,
            item.views || 0,
            item.copies || 0,
            item.sends || 0,
            item.isDeleted || false,
            item.creatorEmail || null,
            item.creatorName || null,
            item.hubId || null,
            item.subCategory || null,
            item.category || null,
            item.topic || null,
            item.isLocked || false,
          ]
        );
      }
      await client.query("COMMIT");
      return;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error writing resources to Postgres:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  const filePath = getResourcesJsonPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function getResourceById(id: string): Promise<Resource | null> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      const res = await client.query("SELECT * FROM vit_resources WHERE id = $1", [id]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        title: row.title,
        type: row.type,
        language: row.language || undefined,
        tags: typeof row.tags === "string" ? JSON.parse(row.tags) : (Array.isArray(row.tags) ? row.tags : []),
        content: row.content,
        views: row.views || 0,
        copies: row.copies || 0,
        sends: row.sends || 0,
        isDeleted: !!row.is_deleted,
        isLocked: !!row.is_locked,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        creatorEmail: row.creator_email || undefined,
        creatorName: row.creator_name || undefined,
        hubId: row.hub_id || undefined,
        subCategory: row.sub_category || undefined,
        category: row.category || undefined,
        topic: row.topic || undefined,
      };
    } finally {
      client.release();
    }
  }

  const resources = await readResources(true);
  return resources.find((r) => r.id === id) || null;
}

export async function createResource(resource: Resource): Promise<void> {
  invalidateCache();
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO vit_resources (id, title, type, language, tags, content, description, views, copies, sends, is_deleted, creator_email, creator_name, hub_id, sub_category, category, topic, is_locked) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          resource.id,
          resource.title,
          resource.type,
          resource.language || null,
          JSON.stringify(resource.tags || []),
          resource.content,
          resource.description || null,
          resource.views || 0,
          resource.copies || 0,
          resource.sends || 0,
          resource.isDeleted || false,
          resource.creatorEmail || null,
          resource.creatorName || null,
          resource.hubId || null,
          resource.subCategory || null,
          resource.category || null,
          resource.topic || null,
          resource.isLocked || false,
        ]
      );
    } finally {
      client.release();
    }
  } else {
    const resources = await readResources(true);
    resources.unshift(resource);
    await writeResources(resources);
  }
}

export async function updateResource(resource: Resource): Promise<void> {
  invalidateCache();
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE vit_resources 
         SET title = $2, type = $3, language = $4, tags = $5, content = $6, description = $7, is_deleted = $8, creator_email = $9, creator_name = $10, hub_id = $11, sub_category = $12, category = $13, topic = $14, is_locked = $15
         WHERE id = $1`,
        [
          resource.id,
          resource.title,
          resource.type,
          resource.language || null,
          JSON.stringify(resource.tags || []),
          resource.content,
          resource.description || null,
          resource.isDeleted || false,
          resource.creatorEmail || null,
          resource.creatorName || null,
          resource.hubId || null,
          resource.subCategory || null,
          resource.category || null,
          resource.topic || null,
          resource.isLocked || false,
        ]
      );
    } finally {
      client.release();
    }
  } else {
    const resources = await readResources(true);
    const idx = resources.findIndex((r) => r.id === resource.id);
    if (idx !== -1) {
      resources[idx] = { ...resources[idx], ...resource };
      await writeResources(resources);
    }
  }
}

export async function deleteResource(id: string): Promise<void> {
  invalidateCache();
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("DELETE FROM vit_resources WHERE id = $1", [id]);
    } finally {
      client.release();
    }
  } else {
    const resources = await readResources(true);
    const filtered = resources.filter((r) => r.id !== id);
    await writeResources(filtered);
  }
}


export async function incrementResourceStats(id: string, field: "views" | "copies" | "sends"): Promise<void> {
  invalidateCache();
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      if (field === "views") {
        await client.query("UPDATE vit_resources SET views = views + 1 WHERE id = $1", [id]);
      } else if (field === "copies") {
        await client.query("UPDATE vit_resources SET copies = copies + 1 WHERE id = $1", [id]);
      } else if (field === "sends") {
        await client.query("UPDATE vit_resources SET sends = sends + 1 WHERE id = $1", [id]);
      }
    } finally {
      client.release();
    }
  } else {
    const resources = await readResources(true);
    const item = resources.find((r) => r.id === id);
    if (item) {
      if (field === "views") item.views = (item.views || 0) + 1;
      if (field === "copies") item.copies = (item.copies || 0) + 1;
      if (field === "sends") item.sends = (item.sends || 0) + 1;
      await writeResources(resources);
    }
  }
}

export async function readCollections(includeDeleted = false): Promise<Collection[]> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      const query = includeDeleted
        ? "SELECT * FROM vit_collections ORDER BY created_at DESC"
        : "SELECT * FROM vit_collections WHERE is_deleted = false ORDER BY created_at DESC";
      const res = await client.query(query);
      return res.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || undefined,
        isDeleted: !!row.is_deleted,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        creatorEmail: row.creator_email || undefined,
      }));
    } catch (error) {
      console.error("Error reading collections from Postgres:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  const filePath = getCollectionsJsonPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      const items = data.map((item: any) => ({
        ...item,
        isDeleted: !!item.isDeleted,
      }));
      if (includeDeleted) return items;
      return items.filter((item: any) => !item.isDeleted);
    }
    return [];
  } catch (error) {
    return [];
  }
}

export async function writeCollections(data: Collection[]): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM vit_collections");
      for (const item of data) {
        await client.query(
          `INSERT INTO vit_collections (id, title, description, is_deleted, creator_email) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            item.id,
            item.title,
            item.description || null,
            item.isDeleted || false,
            item.creatorEmail || null,
          ]
        );
      }
      await client.query("COMMIT");
      return;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error writing collections to Postgres:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  const filePath = getCollectionsJsonPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function createCollection(collection: Collection): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO vit_collections (id, title, description, is_deleted, creator_email) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          collection.id,
          collection.title,
          collection.description || null,
          collection.isDeleted || false,
          collection.creatorEmail || null,
        ]
      );
    } finally {
      client.release();
    }
  } else {
    const collections = await readCollections(true);
    collections.unshift(collection);
    await writeCollections(collections);
  }
}

export interface ExamSettings {
  rules: Record<string, string>;
  sessionLimits: Record<string, number>;
  examYears: Record<string, string>;
}

export async function readRules(): Promise<ExamSettings> {
  return { rules: {}, sessionLimits: {}, examYears: {} };
}

export async function writeRule(examType: string, rule?: string, sessionLimit?: number, year?: string): Promise<void> {
  // No-op for compatibility
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
    dbStatus = "Connected (Local JSON Database)";
    try {
      const resources = await readResources(true);
      const collections = await readCollections(true);
      sessionsCount = collections.length;
      questionsCount = resources.length;
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
      "INSERT INTO vit_coupons (code, discount, usage, status, expires_at, max_uses) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (code) DO UPDATE SET discount = EXCLUDED.discount, usage = EXCLUDED.usage, status = EXCLUDED.status, expires_at = EXCLUDED.expires_at, max_uses = EXCLUDED.max_uses",
      [
        coupon.code, 
        coupon.discount, 
        coupon.usage || 0, 
        coupon.status || 'active',
        coupon.expires_at || null,
        coupon.max_uses !== undefined ? parseInt(coupon.max_uses, 10) : 100
      ]
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
  console.log("readUsersRbac: filePath =", filePath);
  try {
    if (!fs.existsSync(filePath)) {
      console.log("readUsersRbac: file does not exist, creating default");
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
    const parsed = JSON.parse(data);
    console.log("readUsersRbac: file read success, users count =", parsed.users?.length);
    return parsed;
  } catch (e: any) {
    console.error("readUsersRbac error:", e);
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
  console.log("getDbUsers: pool exists:", !!pool);
  if (pool) {
    try {
      const res = await pool.query('SELECT id, name, email, role, status, verified, activity, joined_date as "joinedDate", active_devices as "activeDevices", premium, password, consent_emails as "consentEmails", referral FROM vit_users ORDER BY id ASC');
      console.log("getDbUsers: pool query returned rows count:", res.rows.length);
      return res.rows;
    } catch (e: any) {
      console.error("getDbUsers: pool query error:", e);
      return [];
    }
  } else {
    const data = await readUsersRbac();
    console.log("getDbUsers: fallback JSON readUsersRbac users count:", data.users?.length);
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
      "INSERT INTO vit_users (id, name, email, role, status, verified, activity, joined_date, active_devices, premium, password, consent_emails, referral) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, status = EXCLUDED.status, verified = EXCLUDED.verified, activity = EXCLUDED.activity, joined_date = EXCLUDED.joined_date, active_devices = EXCLUDED.active_devices, premium = EXCLUDED.premium, password = EXCLUDED.password, consent_emails = EXCLUDED.consent_emails, referral = EXCLUDED.referral",
      [user.id, user.name, user.email, user.role, user.status, user.verified, user.activity, user.joinedDate, user.activeDevices, user.premium, user.password || 'check', user.consentEmails || false, user.referral || null]
    );
  } else {
    const data = await readUsersRbac();
    const exists = data.users.some((u: any) => u.email === user.email || u.id === user.id);
    if (exists) {
      data.users = data.users.map((u: any) => (u.email === user.email || u.id === user.id) ? { ...u, ...user } : u);
    } else {
      data.users.push(user);
    }
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
  if (role === "ADMIN MASTER") {
    throw new Error("ADMIN MASTER role permissions are frozen and cannot be modified.");
  }
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
      free_enabled: true,
      plans: [
        {
          tier: "Free",
          title: "Free Pass",
          subtitle: "Basic local bridging",
          price: "₹0",
          validity_days: 365,
          max_sessions: 5,
          max_resources_per_month: 5,
          allow_live_sync: 0,
          allow_typing: 0,
          allow_typing_mode: 0,
          allow_inject: 0,
          allow_raw: 1,
          allow_select_copy: 0,
          allow_fetch: 0,
          allow_refill: 0,
          allow_resource_access: 1,
          allow_resource_analytics: 0,
          allow_tunnel: -1
        },
        {
          tier: "Pro",
          title: "Pro Pass",
          subtitle: "Full power for local builders",
          price: "₹99",
          validity_days: 30,
          max_sessions: 999,
          max_resources_per_month: 100,
          allow_live_sync: 1,
          allow_typing: 1,
          allow_typing_mode: 1,
          allow_inject: 1,
          allow_raw: 1,
          allow_select_copy: 1,
          allow_fetch: 1,
          allow_refill: 1,
          allow_resource_access: 1,
          allow_resource_analytics: 0,
          allow_tunnel: 1
        },
        {
          tier: "Creator",
          title: "Creator Pass",
          subtitle: "Publishing and analytics",
          price: "₹299",
          validity_days: 120,
          max_sessions: 999,
          max_resources_per_month: 9999,
          allow_live_sync: 1,
          allow_typing: 1,
          allow_typing_mode: 1,
          allow_inject: 1,
          allow_raw: 1,
          allow_select_copy: 1,
          allow_fetch: 1,
          allow_refill: 1,
          allow_resource_access: 1,
          allow_resource_analytics: 1,
          allow_tunnel: 1
        }
      ]
    };
  } else {
    if (settings.free_enabled === undefined) {
      settings.free_enabled = true;
    }
    if (!settings.plans) {
      settings.plans = [];
    }
    const hasFree = settings.plans.some((p: any) => p.tier === "Free");
    if (!hasFree) {
      settings.plans.unshift({
        tier: "Free",
        title: "Free Pass",
        subtitle: "Basic local bridging",
        price: "₹0",
        validity_days: 365,
        max_sessions: 5,
        max_resources_per_month: 5,
        allow_live_sync: 0,
        allow_typing: 0,
        allow_typing_mode: 0,
        allow_inject: 0,
        allow_raw: 1,
        allow_select_copy: 0,
        allow_fetch: 0,
        allow_refill: 0,
        allow_resource_access: 1,
        allow_resource_analytics: 0,
        allow_tunnel: -1
      });
    }
    settings.plans.forEach((plan: any) => {
      if (plan.allow_tunnel === undefined) {
        plan.allow_tunnel = (plan.tier === "Free") ? -1 : 1;
      }
      if (plan.max_resources_per_month === undefined) {
        plan.max_resources_per_month = plan.tier === "Free" ? 5 : (plan.tier === "Pro" ? 100 : 9999);
      }
      if (plan.allow_resource_access === undefined) {
        plan.allow_resource_access = 1;
      }
      if (plan.allow_resource_analytics === undefined) {
        plan.allow_resource_analytics = plan.tier === "Creator" ? 1 : 0;
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
  const finalDays = isNaN(durationDays) || durationDays <= 0 ? 30 : durationDays;
  const expiresAt = new Date(Date.now() + finalDays * 24 * 60 * 60 * 1000).toISOString();
  
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

export async function getReferrals(): Promise<any[]> {
  if (pool) {
    try {
      const res = await pool.query("SELECT * FROM vit_referrals ORDER BY created_at DESC");
      return res.rows;
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  return [];
}

export async function getReferralCodes(): Promise<any[]> {
  if (pool) {
    try {
      const res = await pool.query("SELECT * FROM vit_referrer_codes ORDER BY created_at DESC");
      return res.rows;
    } catch (e) {
      console.error(e);
      return [];
    }
  }
  return [];
}

export async function getReferralCodeByEmail(email: string): Promise<string | null> {
  if (pool) {
    try {
      const res = await pool.query("SELECT referral_code FROM vit_referrer_codes WHERE email = $1", [email]);
      if (res.rows.length > 0) {
        return res.rows[0].referral_code;
      }
    } catch (e) {
      console.error(e);
    }
  }
  return null;
}

export async function getEmailByReferralCode(code: string): Promise<string | null> {
  if (pool) {
    try {
      const res = await pool.query("SELECT email FROM vit_referrer_codes WHERE referral_code = $1", [code]);
      if (res.rows.length > 0) {
        return res.rows[0].email;
      }
    } catch (e) {
      console.error(e);
    }
  }
  return null;
}

export async function createReferralCode(email: string, code: string): Promise<void> {
  if (pool) {
    await pool.query(
      "INSERT INTO vit_referrer_codes (email, referral_code) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET referral_code = EXCLUDED.referral_code",
      [email, code]
    );
  }
}

export async function addReferral(referrerEmail: string, referredEmail: string): Promise<void> {
  if (pool) {
    await pool.query(
      "INSERT INTO vit_referrals (referrer_email, referred_email, status) VALUES ($1, $2, 'pending') ON CONFLICT (referred_email) DO NOTHING",
      [referrerEmail, referredEmail]
    );
  }
}

export async function rewardReferrer(referredEmail: string): Promise<void> {
  if (pool) {
    try {
      // Find the referral record
      const refRes = await pool.query("SELECT * FROM vit_referrals WHERE referred_email = $1 AND status = 'pending'", [referredEmail]);
      if (refRes.rows.length === 0) return;
      const refRecord = refRes.rows[0];
      const referrerEmail = refRecord.referrer_email;

      // Fetch reward days from settings
      let rewardDays = 7;
      const settingsRes = await pool.query("SELECT value FROM vit_settings WHERE key = 'monetization_settings'");
      if (settingsRes.rows.length > 0) {
        const settings = JSON.parse(settingsRes.rows[0].value);
        rewardDays = parseInt(settings.referral_reward_days, 10) || 7;
      }

      // Check if referrer has an active license to extend, otherwise generate a new one
      const licRes = await pool.query("SELECT * FROM vit_licenses WHERE email = $1 ORDER BY expires_at DESC LIMIT 1", [referrerEmail]);
      if (licRes.rows.length > 0) {
        const lic = licRes.rows[0];
        // Extend existing license
        const currentExpiry = new Date(lic.expires_at).getTime();
        const newExpiry = new Date(Math.max(currentExpiry, Date.now()) + rewardDays * 24 * 60 * 60 * 1000);
        await pool.query("UPDATE vit_licenses SET expires_at = $1 WHERE key = $2", [newExpiry.toISOString(), lic.key]);
      } else {
        // Generate a new Pro license key for the referrer
        const key = "REF-" + Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
        const expiresAt = new Date(Date.now() + rewardDays * 24 * 60 * 60 * 1000);
        await pool.query(
          "INSERT INTO vit_licenses (key, tier, email, expires_at) VALUES ($1, $2, $3, $4)",
          [key, "Pro", referrerEmail, expiresAt.toISOString()]
        );
      }

      // Update referral status to 'rewarded'
      await pool.query("UPDATE vit_referrals SET status = 'rewarded' WHERE referred_email = $1", [referredEmail]);
    } catch (e) {
      console.error("Error in rewardReferrer:", e);
    }
  }
}

export async function getSetting(key: string, defaultValue: string): Promise<string> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      const res = await client.query("SELECT value FROM vit_settings WHERE key = $1", [key]);
      if (res.rows.length > 0) {
        return res.rows[0].value;
      }
    } finally {
      client.release();
    }
  } else {
    const filePath = path.join(process.env.VERCEL || process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data"), "settings.json");
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (data[key] !== undefined) return data[key];
      } catch (e) {}
    }
  }
  return defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        "INSERT INTO vit_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        [key, value]
      );
    } finally {
      client.release();
    }
  } else {
    const filePath = path.join(process.env.VERCEL || process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data"), "settings.json");
    let data: any = {};
    if (fs.existsSync(filePath)) {
      try { data = JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (e) {}
    }
    data[key] = value;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  }
}

export async function hasSubscription(id: string): Promise<boolean> {
  if (pool) {
    try {
      await initDb();
      const res = await pool.query("SELECT 1 FROM vit_subscriptions WHERE id = $1", [id]);
      return res.rows.length > 0;
    } catch (e) {
      console.error(e);
      return false;
    }
  } else {
    const data = await readMonetization();
    return data.subscriptions.some((s: any) => s.id === id);
  }
}

export async function getLegalAcceptances(): Promise<any[]> {
  if (pool) {
    await initDb();
    const res = await pool.query(`
      SELECT 
        e.id, 
        e.uuid as hwid, 
        e.event, 
        e.timestamp,
        l.email
      FROM vit_telemetry_events e
      LEFT JOIN vit_licenses l ON e.uuid = l.hwid
      WHERE e.event LIKE 'terms_acceptance:%'
      ORDER BY e.timestamp DESC
    `);
    return res.rows;
  }
  
  const filePath = path.join(process.env.VERCEL || process.env.NODE_ENV === "production" ? "/tmp" : path.join(process.cwd(), "data"), "telemetry.json");
  let events: any[] = [];
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      events = data.events || [];
    } catch (e) {}
  }
  
  const licenses = await getAllLicenses();
  
  return events
    .filter((e: any) => e.event && e.event.startsWith("terms_acceptance:"))
    .map((e: any, idx: number) => {
      const matchedLic = licenses.find((l: any) => l.hwid === e.uuid);
      return {
        id: idx + 1,
        hwid: e.uuid,
        event: e.event,
        timestamp: e.timestamp,
        email: matchedLic ? matchedLic.email : null
      };
    })
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function createReport(report: {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string;
  reporter_contact?: string;
  reporter_ip: string;
}): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        "INSERT INTO vit_reports (id, target_type, target_id, reason, details, reporter_contact, reporter_ip, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())",
        [
          report.id,
          report.target_type,
          report.target_id,
          report.reason,
          report.details,
          report.reporter_contact || null,
          report.reporter_ip
        ]
      );
    } finally {
      client.release();
    }
  } else {
    const filePath = getReportsJsonFilePath();
    let data: any[] = [];
    if (fs.existsSync(filePath)) {
      try {
        data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (e) {}
    }
    data.push({
      ...report,
      status: "pending",
      created_at: new Date().toISOString()
    });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  }
}

export async function getReports(): Promise<any[]> {
  if (pool) {
    await initDb();
    const res = await pool.query("SELECT * FROM vit_reports ORDER BY created_at DESC");
    return res.rows;
  } else {
    const filePath = getReportsJsonFilePath();
    if (fs.existsSync(filePath)) {
      try {
        return JSON.parse(fs.readFileSync(filePath, "utf8")).sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } catch (e) {}
    }
    return [];
  }
}

export async function resolveReport(id: string, status: string): Promise<void> {
  if (pool) {
    await initDb();
    await pool.query("UPDATE vit_reports SET status = $1 WHERE id = $2", [status, id]);
  } else {
    const filePath = getReportsJsonFilePath();
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const report = data.find((r: any) => r.id === id);
        if (report) {
          report.status = status;
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
        }
      } catch (e) {}
    }
  }
}

function getReportsJsonFilePath() {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
  return path.join(baseDir, "reports.json");
}

export interface Hub {
  id: string;
  title: string;
  description?: string;
  creatorEmail: string;
  createdAt?: string;
  isDeleted?: boolean;
  visibility?: "public" | "private";
  allowedTypes?: string[];
  subCategories?: string[];
  categories?: CategoryConfig[];
}

export interface HubContributor {
  id?: number;
  hubId: string;
  contributorEmail: string;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
}

export async function readHubs(includeDeleted = false): Promise<Hub[]> {
  const now = Date.now();
  if (pool) {
    if (globalCache.cachedHubs && globalCache.cachedHubsTime && (now - globalCache.cachedHubsTime < 5000)) {
      return includeDeleted ? globalCache.cachedHubs : globalCache.cachedHubs.filter(h => !h.isDeleted);
    }
    await initDb();
    const client = await pool.connect();
    try {
      const query = "SELECT * FROM hubs ORDER BY created_at DESC";
      const res = await client.query(query);
      const rows = res.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || undefined,
        creatorEmail: row.creator_email,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
        isDeleted: !!row.is_deleted,
        visibility: (row.visibility as any) || "public",
        allowedTypes: row.allowed_types ? JSON.parse(row.allowed_types) : ["code", "link", "text"],
        subCategories: row.sub_categories ? JSON.parse(row.sub_categories) : [],
        categories: row.categories ? JSON.parse(row.categories) : [],
      }));
      globalCache.cachedHubs = rows;
      globalCache.cachedHubsTime = now;
      return includeDeleted ? rows : rows.filter(h => !h.isDeleted);
    } catch (error) {
      console.error("Error reading hubs from Postgres:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  const filePath = getHubsJsonPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      const items = data.map((item: any) => ({
        ...item,
        isDeleted: !!item.isDeleted,
        visibility: item.visibility || "public",
        allowedTypes: item.allowedTypes || ["code", "link", "text"],
        subCategories: item.subCategories || [],
        categories: item.categories || [],
      }));
      if (includeDeleted) return items;
      return items.filter((item: any) => !item.isDeleted);
    }
    return [];
  } catch (error) {
    return [];
  }
}

export async function writeHubs(data: Hub[]): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM hubs");
      for (const item of data) {
        await client.query(
          `INSERT INTO hubs (id, title, description, creator_email, is_deleted, visibility, allowed_types, sub_categories, categories) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            item.id,
            item.title,
            item.description || null,
            item.creatorEmail,
            item.isDeleted || false,
            item.visibility || "public",
            JSON.stringify(item.allowedTypes || ["code", "link", "text"]),
            JSON.stringify(item.subCategories || []),
            JSON.stringify(item.categories || []),
          ]
        );
      }
      await client.query("COMMIT");
      return;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error writing hubs to Postgres:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  const filePath = getHubsJsonPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function createHub(hub: Hub): Promise<void> {
  invalidateCache();
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO hubs (id, title, description, creator_email, is_deleted, visibility, allowed_types, sub_categories, categories) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          hub.id,
          hub.title,
          hub.description || null,
          hub.creatorEmail,
          hub.isDeleted || false,
          hub.visibility || "public",
          JSON.stringify(hub.allowedTypes || ["code", "link", "text"]),
          JSON.stringify(hub.subCategories || []),
          JSON.stringify(hub.categories || []),
        ]
      );
    } finally {
      client.release();
    }
  } else {
    const hubs = await readHubs(true);
    hubs.unshift(hub);
    await writeHubs(hubs);
  }
}

export async function updateHub(hub: Hub): Promise<void> {
  invalidateCache();
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE hubs 
         SET title = $2, description = $3, creator_email = $4, is_deleted = $5, visibility = $6, allowed_types = $7, sub_categories = $8, categories = $9
         WHERE id = $1`,
        [
          hub.id,
          hub.title,
          hub.description || null,
          hub.creatorEmail,
          hub.isDeleted || false,
          hub.visibility || "public",
          JSON.stringify(hub.allowedTypes || ["code", "link", "text"]),
          JSON.stringify(hub.subCategories || []),
          JSON.stringify(hub.categories || []),
        ]
      );
    } finally {
      client.release();
    }
  } else {
    const list = await readHubs(true);
    const idx = list.findIndex(h => h.id === hub.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...hub };
      await writeHubs(list);
    }
  }
}

export async function readHubContributors(): Promise<HubContributor[]> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      const res = await client.query("SELECT * FROM hub_contributors ORDER BY created_at DESC");
      return res.rows.map((row) => ({
        id: row.id,
        hubId: row.hub_id,
        contributorEmail: row.contributor_email,
        status: row.status as any,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
      }));
    } catch (error) {
      console.error("Error reading hub contributors from Postgres:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  const filePath = getHubContributorsJsonPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    return [];
  }
}

export async function writeHubContributors(data: HubContributor[]): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM hub_contributors");
      for (const item of data) {
        await client.query(
          `INSERT INTO hub_contributors (hub_id, contributor_email, status) 
           VALUES ($1, $2, $3)`,
          [
            item.hubId,
            item.contributorEmail,
            item.status,
          ]
        );
      }
      await client.query("COMMIT");
      return;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error writing hub contributors to Postgres:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  const filePath = getHubContributorsJsonPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function addContributorRequest(hubId: string, email: string): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO hub_contributors (hub_id, contributor_email, status) 
         VALUES ($1, $2, $3)
         ON CONFLICT (hub_id, contributor_email) DO UPDATE SET status = $3`,
        [hubId, email, "pending"]
      );
    } finally {
      client.release();
    }
  } else {
    const list = await readHubContributors();
    const idx = list.findIndex((item) => item.hubId === hubId && item.contributorEmail === email);
    if (idx !== -1) {
      list[idx].status = "pending";
    } else {
      list.push({ hubId, contributorEmail: email, status: "pending" });
    }
    await writeHubContributors(list);
  }
}

export async function updateContributorStatus(hubId: string, email: string, status: "pending" | "approved" | "rejected"): Promise<void> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO hub_contributors (hub_id, contributor_email, status) 
         VALUES ($1, $2, $3)
         ON CONFLICT (hub_id, contributor_email) DO UPDATE SET status = $3`,
        [hubId, email, status]
      );
    } finally {
      client.release();
    }
  } else {
    const list = await readHubContributors();
    const idx = list.findIndex((item) => item.hubId === hubId && item.contributorEmail === email);
    if (idx !== -1) {
      list[idx].status = status;
    } else {
      list.push({ hubId, contributorEmail: email, status });
    }
    await writeHubContributors(list);
  }
}

export async function isApprovedContributor(hubId: string, email: string): Promise<boolean> {
  if (pool) {
    await initDb();
    const client = await pool.connect();
    try {
      const res = await client.query(
        "SELECT status FROM hub_contributors WHERE hub_id = $1 AND contributor_email = $2",
        [hubId, email]
      );
      if (res.rows.length === 0) return false;
      return res.rows[0].status === "approved";
    } finally {
      client.release();
    }
  } else {
    const list = await readHubContributors();
    const found = list.find((item) => item.hubId === hubId && item.contributorEmail === email);
    return found ? found.status === "approved" : false;
  }
}

export async function deleteHub(id: string): Promise<void> {
  invalidateCache();
  if (pool) {
    await initDb();
    await pool.query("UPDATE hubs SET is_deleted = true WHERE id = $1", [id]);
  } else {
    const list = await readHubs(true);
    const found = list.find(h => h.id === id);
    if (found) {
      found.isDeleted = true;
      await writeHubs(list);
    }
  }
}

const getHubsJsonPath = () => {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
  return path.join(baseDir, "hubs.json");
};

const getHubContributorsJsonPath = () => {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
  return path.join(baseDir, "hub_contributors.json");
};

export interface ClipboardRoom {
  code: string;
  createdAt?: string;
  expiresAt: string;
  durationMins: number;
  allowAllMembersToAdd: boolean;
  hostSessionId: string;
}

export interface ClipboardItem {
  id: string;
  roomCode: string;
  title: string;
  content: string;
  createdAt?: string;
}

const getClipboardJsonPath = () => {
  const isServerless = process.env.VERCEL || process.env.NODE_ENV === "production";
  const baseDir = isServerless ? "/tmp" : path.join(process.cwd(), "data");
  return path.join(baseDir, "clipboard.json");
};

async function readClipboardFile(): Promise<{ rooms: ClipboardRoom[]; items: ClipboardItem[] }> {
  const filePath = getClipboardJsonPath();
  if (!fs.existsSync(filePath)) {
    return { rooms: [], items: [] };
  }
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return { rooms: [], items: [] };
  }
}

async function writeClipboardFile(data: { rooms: ClipboardRoom[]; items: ClipboardItem[] }): Promise<void> {
  const filePath = getClipboardJsonPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export async function createClipboardRoom(room: ClipboardRoom): Promise<void> {
  if (pool) {
    await initDb();
    await pool.query(
      `INSERT INTO vit_clipboard_rooms (code, expires_at, duration_mins, allow_all_members_to_add, host_session_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [room.code, room.expiresAt, room.durationMins, room.allowAllMembersToAdd, room.hostSessionId]
    );
  } else {
    const data = await readClipboardFile();
    const newRoom: ClipboardRoom = {
      ...room,
      createdAt: new Date().toISOString()
    };
    data.rooms.push(newRoom);
    await writeClipboardFile(data);
  }
}

export async function getClipboardRoom(code: string): Promise<ClipboardRoom | null> {
  await cleanupExpiredClipboardRooms();
  if (pool) {
    await initDb();
    const res = await pool.query(
      `SELECT code, created_at as "createdAt", expires_at as "expiresAt", 
              duration_mins as "durationMins", allow_all_members_to_add as "allowAllMembersToAdd", 
              host_session_id as "hostSessionId" 
       FROM vit_clipboard_rooms WHERE code = $1`,
      [code]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  } else {
    const data = await readClipboardFile();
    const found = data.rooms.find(r => r.code.toUpperCase() === code.toUpperCase());
    if (!found) return null;
    if (new Date(found.expiresAt).getTime() < Date.now()) {
      return null;
    }
    return found;
  }
}

export async function addClipboardItem(item: ClipboardItem): Promise<void> {
  if (pool) {
    await initDb();
    await pool.query(
      "INSERT INTO vit_clipboard_items (id, room_code, title, content) VALUES ($1, $2, $3, $4)",
      [item.id, item.roomCode, item.title, item.content]
    );
  } else {
    const data = await readClipboardFile();
    const newItem: ClipboardItem = {
      ...item,
      createdAt: new Date().toISOString()
    };
    data.items.push(newItem);
    await writeClipboardFile(data);
  }
}

export async function getClipboardItems(roomCode: string): Promise<ClipboardItem[]> {
  if (pool) {
    await initDb();
    const res = await pool.query(
      `SELECT id, room_code as "roomCode", title, content, created_at as "createdAt" 
       FROM vit_clipboard_items WHERE room_code = $1 ORDER BY created_at DESC`,
      [roomCode]
    );
    return res.rows;
  } else {
    const data = await readClipboardFile();
    return data.items
      .filter(i => i.roomCode.toUpperCase() === roomCode.toUpperCase())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }
}

export async function cleanupExpiredClipboardRooms(): Promise<void> {
  const now = new Date();
  if (pool) {
    await initDb();
    await pool.query(
      "DELETE FROM vit_clipboard_items WHERE room_code IN (SELECT code FROM vit_clipboard_rooms WHERE expires_at < $1)",
      [now]
    );
    await pool.query(
      "DELETE FROM vit_clipboard_rooms WHERE expires_at < $1",
      [now]
    );
  } else {
    const data = await readClipboardFile();
    const activeRooms = data.rooms.filter(r => new Date(r.expiresAt).getTime() >= now.getTime());
    const expiredRoomCodes = new Set(
      data.rooms
        .filter(r => new Date(r.expiresAt).getTime() < now.getTime())
        .map(r => r.code.toUpperCase())
    );
    const activeItems = data.items.filter(i => !expiredRoomCodes.has(i.roomCode.toUpperCase()));
    await writeClipboardFile({ rooms: activeRooms, items: activeItems });
  }
}

export async function deleteClipboardItem(id: string): Promise<void> {
  if (pool) {
    await initDb();
    await pool.query("DELETE FROM vit_clipboard_items WHERE id = $1", [id]);
  } else {
    const data = await readClipboardFile();
    data.items = data.items.filter(i => i.id !== id);
    await writeClipboardFile(data);
  }
}

export async function getClipboardItemById(id: string): Promise<ClipboardItem | null> {
  if (pool) {
    await initDb();
    const res = await pool.query(
      `SELECT id, room_code as "roomCode", title, content, created_at as "createdAt" 
       FROM vit_clipboard_items WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return res.rows[0];
  } else {
    const data = await readClipboardFile();
    const found = data.items.find(i => i.id === id);
    return found || null;
  }
}

export async function updateRoomPermissions(code: string, allowAllMembersToAdd: boolean): Promise<void> {
  if (pool) {
    await initDb();
    await pool.query(
      `UPDATE vit_clipboard_rooms 
       SET allow_all_members_to_add = $1 
       WHERE code = $2`,
      [allowAllMembersToAdd, code.toUpperCase()]
    );
  } else {
    const data = await readClipboardFile();
    const idx = data.rooms.findIndex(r => r.code.toUpperCase() === code.toUpperCase());
    if (idx !== -1) {
      data.rooms[idx].allowAllMembersToAdd = allowAllMembersToAdd;
      await writeClipboardFile(data);
    }
  }
}

export async function touchActiveUser(roomCode: string, sessionId: string): Promise<void> {
  if (pool) {
    await initDb();
    await pool.query(
      `INSERT INTO vit_clipboard_active_users (room_code, session_id, last_active)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (room_code, session_id)
       DO UPDATE SET last_active = CURRENT_TIMESTAMP`,
      [roomCode.toUpperCase(), sessionId]
    );
  } else {
    const globalRef = globalThis as any;
    if (!globalRef.activeUsersMap) {
      globalRef.activeUsersMap = new Map<string, Map<string, number>>();
    }
    const roomMap = globalRef.activeUsersMap.get(roomCode.toUpperCase()) || new Map<string, number>();
    roomMap.set(sessionId, Date.now());
    globalRef.activeUsersMap.set(roomCode.toUpperCase(), roomMap);
  }
}

export async function getActiveUsersCount(roomCode: string): Promise<number> {
  if (pool) {
    await initDb();
    const cutoff = new Date(Date.now() - 15000);
    await pool.query(
      `DELETE FROM vit_clipboard_active_users WHERE last_active < $1`,
      [cutoff]
    );
    const res = await pool.query(
      `SELECT COUNT(DISTINCT session_id) as count 
       FROM vit_clipboard_active_users 
       WHERE room_code = $1`,
      [roomCode.toUpperCase()]
    );
    return parseInt(res.rows[0].count, 10);
  } else {
    const globalRef = globalThis as any;
    if (!globalRef.activeUsersMap) return 0;
    const roomMap = globalRef.activeUsersMap.get(roomCode.toUpperCase());
    if (!roomMap) return 0;
    
    const now = Date.now();
    let count = 0;
    for (const [sessId, lastTime] of roomMap.entries()) {
      if (now - lastTime < 15000) {
        count++;
      } else {
        roomMap.delete(sessId);
      }
    }
    return count;
  }
}

export async function updateRoomExpiration(code: string, expiresAt: string): Promise<void> {
  if (pool) {
    await initDb();
    await pool.query(
      `UPDATE vit_clipboard_rooms 
       SET expires_at = $1 
       WHERE code = $2`,
      [expiresAt, code.toUpperCase()]
    );
  } else {
    const data = await readClipboardFile();
    const idx = data.rooms.findIndex(r => r.code.toUpperCase() === code.toUpperCase());
    if (idx !== -1) {
      data.rooms[idx].expiresAt = expiresAt;
      await writeClipboardFile(data);
    }
  }
}

// ── File chunk storage helpers ───────────────────────────────────────────────

export async function saveFileChunk(
  uploadId: string,
  chunkIndex: number,
  chunkData: string,   // base64 string (no data URI prefix)
  fileName: string,
  fileType: string,
  fileSize: number
): Promise<void> {
  if (pool) {
    await initDb();
    await pool.query(
      `INSERT INTO vit_clipboard_file_chunks
         (upload_id, chunk_index, chunk_data, file_name, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (upload_id, chunk_index) DO UPDATE SET chunk_data = EXCLUDED.chunk_data`,
      [uploadId, chunkIndex, chunkData, fileName, fileType, fileSize]
    );
  }
}

export async function getFileChunks(
  uploadId: string
): Promise<{ chunkIndex: number; chunkData: string; fileName: string; fileType: string; fileSize: number }[]> {
  if (pool) {
    await initDb();
    const res = await pool.query(
      `SELECT chunk_index as "chunkIndex", chunk_data as "chunkData",
              file_name as "fileName", file_type as "fileType", file_size as "fileSize"
       FROM vit_clipboard_file_chunks
       WHERE upload_id = $1
       ORDER BY chunk_index ASC`,
      [uploadId]
    );
    return res.rows;
  }
  return [];
}

export async function deleteFileChunks(uploadId: string): Promise<void> {
  if (pool) {
    await initDb();
    await pool.query(
      `DELETE FROM vit_clipboard_file_chunks WHERE upload_id = $1`,
      [uploadId]
    );
  }
}

// Cleanup stale chunks older than 2 hours (call periodically)
export async function cleanupStaleChunks(): Promise<void> {
  if (pool) {
    await initDb();
    await pool.query(
      `DELETE FROM vit_clipboard_file_chunks WHERE created_at < NOW() - INTERVAL '2 hours'`
    );
  }
}
