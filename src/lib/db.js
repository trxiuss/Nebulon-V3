import { getDB, getEnv } from "@/lib/env";
import { generateSalt, hashPassword } from "@/lib/crypto";
import {
  ALL_PERMISSION_KEYS,
  SYSTEM_ROLE_SLUG,
  OWNER_ROLE_RANK,
  DEFAULT_ROLE_RANK
} from "@/lib/permissions";

const SCHEMA_VERSION = 6;

const REQUIRED_TABLES = [
  "roles",
  "users",
  "categories",
  "products",
  "team",
  "contact_section",
  "footer_icons",
  "settings",
  "auth_logs",
  "audit_logs"
];

const NEW_TABLES = [
  `CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    permissions TEXT NOT NULL DEFAULT '[]',
    is_system INTEGER NOT NULL DEFAULT 0,
    rank INTEGER NOT NULL DEFAULT 100,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'yonetici',
    token_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (role) REFERENCES roles(slug) ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_tr TEXT NOT NULL,
    name_en TEXT,
    slug TEXT NOT NULL UNIQUE,
    description_tr TEXT,
    description_en TEXT,
    icon_key TEXT,
    display_order INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER DEFAULT NULL,
    title_tr TEXT NOT NULL,
    title_en TEXT,
    short_desc_tr TEXT,
    short_desc_en TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    image_type TEXT NOT NULL DEFAULT 'url',
    image_value TEXT,
    download_count INTEGER,
    counter_api_url TEXT,
    count_icon_type TEXT NOT NULL DEFAULT 'download',
    pricing_type TEXT NOT NULL DEFAULT 'free',
    action_type TEXT NOT NULL DEFAULT 'download',
    action_icon_type TEXT NOT NULL DEFAULT 'download',
    action_url TEXT,
    tech_tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role_tr TEXT,
    role_en TEXT,
    avatar_url TEXT,
    socials TEXT NOT NULL DEFAULT '{}',
    display_order INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS contact_section (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    icon_key TEXT,
    title_tr TEXT,
    title_en TEXT,
    description_tr TEXT,
    description_en TEXT,
    button_text_tr TEXT,
    button_text_en TEXT,
    button_url TEXT,
    display_order INTEGER,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS footer_icons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    icon_key TEXT NOT NULL,
    url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS auth_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    event TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    ip TEXT,
    country TEXT,
    country_code TEXT,
    region TEXT,
    city TEXT,
    district TEXT,
    postal_code TEXT,
    latitude TEXT,
    longitude TEXT,
    timezone TEXT,
    asn TEXT,
    isp TEXT,
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    device_type TEXT,
    platform TEXT,
    language TEXT,
    referer TEXT,
    protocol TEXT,
    user_agent TEXT,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, action TEXT NOT NULL, entity_type TEXT, entity_id INTEGER, details TEXT,
    ip TEXT, user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )`
];

const NEW_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(display_order)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_team_order ON team(display_order)`,
  `CREATE INDEX IF NOT EXISTS idx_footer_icons_order ON footer_icons(display_order)`,
  `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_auth_logs_created ON auth_logs(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_auth_logs_user ON auth_logs(user_id)`
];

const NEW_TRIGGERS = [
  `CREATE TRIGGER IF NOT EXISTS trg_users_last_admin_delete
   BEFORE DELETE ON users
   WHEN OLD.role = 'yonetici' AND (SELECT COUNT(*) FROM users WHERE role = 'yonetici') <= 1
   BEGIN SELECT RAISE(ABORT, 'last_admin_protected'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_users_last_admin_demote
   BEFORE UPDATE OF role ON users
   WHEN OLD.role = 'yonetici' AND NEW.role <> 'yonetici' AND (SELECT COUNT(*) FROM users WHERE role = 'yonetici') <= 1
   BEGIN SELECT RAISE(ABORT, 'last_admin_protected'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_roles_system_delete
   BEFORE DELETE ON roles
   WHEN OLD.slug = 'yonetici' OR OLD.is_system = 1
   BEGIN SELECT RAISE(ABORT, 'system_role_protected'); END`,
  `CREATE TRIGGER IF NOT EXISTS trg_roles_system_change
   BEFORE UPDATE OF slug, is_system ON roles
   WHEN OLD.slug = 'yonetici' OR OLD.is_system = 1
   BEGIN SELECT CASE WHEN NEW.slug <> 'yonetici' OR NEW.is_system <> 1 THEN RAISE(ABORT, 'system_role_protected') END; END`
];

async function tableColumns(db, table) {
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    throw new Error('Invalid input');
  }
  const info = await db.prepare(`PRAGMA table_info(${table})`).all();
  return info.results || [];
}

async function hasColumn(db, table, column) {
  const columns = await tableColumns(db, table);
  return columns.some((c) => c.name === column);
}

async function isNotNullColumn(db, table, column) {
  const columns = await tableColumns(db, table);
  const col = columns.find((c) => c.name === column);
  return col ? Number(col.notnull) === 1 : false;
}

async function addColumnIfMissing(db, table, column, definition) {
  if (await hasColumn(db, table, column)) return;
  try {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  } catch (err) {}
}

async function dropColumnIfExists(db, table, column) {
  if (!(await hasColumn(db, table, column))) return;
  try {
    await db.prepare(`ALTER TABLE ${table} DROP COLUMN ${column}`).run();
  } catch (err) {}
}

async function rebuildUsersTable(db) {
  const rows = (await db.prepare("SELECT * FROM users").all()).results || [];
  await db.prepare("DROP TABLE IF EXISTS users_v4").run();
  const custom = await db.prepare("SELECT id FROM roles WHERE slug = ?").bind("icerik-yoneticisi").first().catch(() => null);
  if (!custom && rows.some((row) => row.role === "moderator")) {
    await db.prepare("INSERT INTO roles (name, slug, permissions, is_system, rank) VALUES (?, ?, ?, 0, ?)").bind(
      "İçerik Yöneticisi",
      "icerik-yoneticisi",
      JSON.stringify(ALL_PERMISSION_KEYS.filter((p) => !p.startsWith("users.") && !p.startsWith("roles.") && !p.startsWith("settings."))),
      DEFAULT_ROLE_RANK
    ).run();
  }
  await db.prepare(`CREATE TABLE users_v4 (
    id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, email TEXT,
    password_hash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'yonetici',
    token_version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`).run();
  for (const row of rows) {
    const role = row.role === "owner" ? SYSTEM_ROLE_SLUG : row.role === "moderator" ? "icerik-yoneticisi" : (row.role || SYSTEM_ROLE_SLUG);
    await db.prepare(
      "INSERT INTO users_v4 (id, username, email, password_hash, salt, role, token_version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(row.id, row.username, row.email ?? null, row.password_hash, row.salt, role, row.token_version ?? 1, row.created_at).run();
  }
  await db.prepare("DROP TABLE users").run();
  try {
    await db.prepare("ALTER TABLE users_v4 RENAME TO users").run();
  } catch (err) {
    for (const sql of NEW_TABLES) {
      if (sql.includes("CREATE TABLE IF NOT EXISTS users ")) {
        await db.prepare(sql).run();
      }
    }
    throw err;
  }
}

async function missingTables(db) {
  const existing = (await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()).results || [];
  const names = new Set(existing.map((row) => row.name));
  return REQUIRED_TABLES.filter((name) => !names.has(name));
}

async function migrateUsers(db) {
  const table = await db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").first().catch(() => null);
  if (table?.sql && /CHECK\s*\(\s*role\s+IN\s*\(\s*['\"]owner['\"]\s*,\s*['\"]moderator['\"]\s*\)\s*\)/i.test(table.sql)) {
    await rebuildUsersTable(db);
  }
  await addColumnIfMissing(db, "users", "role", "TEXT");
  await addColumnIfMissing(db, "users", "token_version", "INTEGER");
  await addColumnIfMissing(db, "users", "full_access", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing(db, "users", "email_hash", "TEXT");

  const rows = (await db.prepare("SELECT id, role, token_version FROM users").all()).results || [];
  for (const row of rows) {
    let role = row.role;
    if (role === null || role === undefined || role === "owner") {
      role = SYSTEM_ROLE_SLUG;
      await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(SYSTEM_ROLE_SLUG, row.id).run();
    } else if (role === "owner" || role === "moderator") {
      await db.prepare("UPDATE users SET role = ? WHERE id = ?").bind(SYSTEM_ROLE_SLUG, row.id).run();
    }
    if (row.token_version === null || row.token_version === undefined) {
      await db.prepare("UPDATE users SET token_version = ? WHERE id = ?").bind(1, row.id).run();
    }
  }

  await db.prepare("UPDATE users SET full_access = 1 WHERE role = ?").bind(SYSTEM_ROLE_SLUG).run().catch(() => null);

  await dropColumnIfExists(db, "users", "role_id");
}

async function migrateRoles(db) {
  await addColumnIfMissing(db, "roles", "rank", `INTEGER NOT NULL DEFAULT ${DEFAULT_ROLE_RANK}`);
  await addColumnIfMissing(db, "roles", "version", "INTEGER NOT NULL DEFAULT 1");
  await addColumnIfMissing(db, "roles", "updated_at", "TEXT");

  const rows = (await db.prepare("SELECT id, slug, is_system, rank FROM roles ORDER BY id ASC").all()).results || [];
  let nextRank = 10;

  for (const row of rows) {
    const isOwnerRole = row.slug === SYSTEM_ROLE_SLUG || Number(row.is_system) === 1;
    if (isOwnerRole) {
      if (Number(row.rank) !== OWNER_ROLE_RANK) {
        await db.prepare("UPDATE roles SET rank = ? WHERE id = ?").bind(OWNER_ROLE_RANK, row.id).run();
      }
      continue;
    }
    const current = Number(row.rank);
    if (!Number.isFinite(current) || current <= OWNER_ROLE_RANK) {
      await db.prepare("UPDATE roles SET rank = ? WHERE id = ?").bind(nextRank, row.id).run();
    }
    nextRank += 10;
  }
}

async function migrateAuditLogs(db) {
  await addColumnIfMissing(db, "audit_logs", "ip", "TEXT");
  await addColumnIfMissing(db, "audit_logs", "user_agent", "TEXT");
}

async function migrateCategories(db) {
  await addColumnIfMissing(db, "categories", "is_active", "INTEGER NOT NULL DEFAULT 1");
  await addColumnIfMissing(db, "categories", "display_order", "INTEGER");
  await addColumnIfMissing(db, "categories", "description_tr", "TEXT");
  await addColumnIfMissing(db, "categories", "description_en", "TEXT");
  await addColumnIfMissing(db, "categories", "icon_key", "TEXT");

  if (await hasColumn(db, "categories", "order_index")) {
    const rows = (await db.prepare("SELECT id, order_index, display_order FROM categories").all()).results || [];
    for (const row of rows) {
      if (row.display_order === null || row.display_order === undefined) {
        await db.prepare("UPDATE categories SET display_order = ? WHERE id = ?").bind(row.order_index, row.id).run();
      }
    }
    await dropColumnIfExists(db, "categories", "order_index");
  }
}

async function migrateContactSection(db) {
  await addColumnIfMissing(db, "contact_section", "display_order", "INTEGER");
}

async function migrateTeam(db) {
  await addColumnIfMissing(db, "team", "name", "TEXT");
  await addColumnIfMissing(db, "team", "role_tr", "TEXT");
  await addColumnIfMissing(db, "team", "role_en", "TEXT");
  await addColumnIfMissing(db, "team", "avatar_url", "TEXT");
  await addColumnIfMissing(db, "team", "socials", "TEXT NOT NULL DEFAULT '{}'");
  await addColumnIfMissing(db, "team", "display_order", "INTEGER");
  await addColumnIfMissing(db, "team", "is_active", "INTEGER NOT NULL DEFAULT 1");

  const hasLegacyFullName = await hasColumn(db, "team", "full_name");
  const hasLegacyTitleTr = await hasColumn(db, "team", "title_tr");
  const hasLegacyTitleEn = await hasColumn(db, "team", "title_en");
  const hasLegacyImageUrl = await hasColumn(db, "team", "image_url");
  const hasLegacyOrder = await hasColumn(db, "team", "order_index");

  if (hasLegacyFullName || hasLegacyTitleTr || hasLegacyTitleEn || hasLegacyImageUrl || hasLegacyOrder) {
    const rows = (await db.prepare("SELECT * FROM team").all()).results || [];
    for (const row of rows) {
      if ((row.name === null || row.name === undefined) && row.full_name) {
        await db.prepare("UPDATE team SET name = ? WHERE id = ?").bind(row.full_name, row.id).run();
      }
      if ((row.role_tr === null || row.role_tr === undefined) && row.title_tr) {
        await db.prepare("UPDATE team SET role_tr = ? WHERE id = ?").bind(row.title_tr, row.id).run();
      }
      if ((row.role_en === null || row.role_en === undefined) && row.title_en) {
        await db.prepare("UPDATE team SET role_en = ? WHERE id = ?").bind(row.title_en, row.id).run();
      }
      if ((row.avatar_url === null || row.avatar_url === undefined) && row.image_url) {
        await db.prepare("UPDATE team SET avatar_url = ? WHERE id = ?").bind(row.image_url, row.id).run();
      }
      if ((row.display_order === null || row.display_order === undefined) && row.order_index !== undefined) {
        await db.prepare("UPDATE team SET display_order = ? WHERE id = ?").bind(row.order_index, row.id).run();
      }
    }
    await dropColumnIfExists(db, "team", "full_name");
    await dropColumnIfExists(db, "team", "title_tr");
    await dropColumnIfExists(db, "team", "title_en");
    await dropColumnIfExists(db, "team", "image_url");
    await dropColumnIfExists(db, "team", "order_index");
  }
}

async function rebuildProductsTable(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS products_v3 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER DEFAULT NULL,
        title_tr TEXT NOT NULL,
        title_en TEXT,
        short_desc_tr TEXT,
        short_desc_en TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        image_type TEXT NOT NULL DEFAULT 'url',
        image_value TEXT,
        download_count INTEGER,
        counter_api_url TEXT,
        count_icon_type TEXT NOT NULL DEFAULT 'download',
        pricing_type TEXT NOT NULL DEFAULT 'free',
        action_type TEXT NOT NULL DEFAULT 'download',
        action_icon_type TEXT NOT NULL DEFAULT 'download',
        action_url TEXT,
        tech_tags TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )`
    )
    .run();

  const oldRows = (await db.prepare("SELECT * FROM products").all()).results || [];
  for (const row of oldRows) {
    await db
      .prepare(
        `INSERT INTO products_v3
          (id, category_id, title_tr, title_en, short_desc_tr, short_desc_en, is_active,
           image_type, image_value, download_count, counter_api_url, count_icon_type, pricing_type,
           action_type, action_icon_type, action_url, tech_tags, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        row.id,
        row.category_id ?? null,
        row.title_tr,
        row.title_en ?? null,
        row.short_desc_tr ?? null,
        row.short_desc_en ?? null,
        row.is_active ?? 1,
        row.image_type || "url",
        row.image_value || row.image_url || null,
        row.download_count ?? null,
        row.counter_api_url ?? null,
        row.count_icon_type || "download",
        row.pricing_type || "free",
        row.action_type || "download",
        row.action_icon_type || "download",
        row.action_url ?? null,
        row.tech_tags || "[]",
        row.created_at
      )
      .run();
  }

  await db.prepare("DROP TABLE products").run();
  await db.prepare("ALTER TABLE products_v3 RENAME TO products").run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)`).run();
}

async function migrateProducts(db) {
  const hasNewMarker = await hasColumn(db, "products", "download_count");
  const categoryNotNull = await isNotNullColumn(db, "products", "category_id");
  const table = await db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'products'").first().catch(() => null);
  const actionConstraintNeedsUpgrade = Boolean(
    table?.sql && /CHECK\s*\(\s*action_type\s+IN/i.test(table.sql) && (!table.sql.includes("'view'") || !table.sql.includes("'github'"))
  );
  if (!hasNewMarker || categoryNotNull || actionConstraintNeedsUpgrade) {
    await rebuildProductsTable(db);
  }

  await addColumnIfMissing(db, "products", "is_active", "INTEGER NOT NULL DEFAULT 1");
  await addColumnIfMissing(db, "products", "counter_api_url", "TEXT");
}

async function seedRoles(db) {
  const existing = await db.prepare("SELECT id, slug FROM roles").all();
  const rows = existing.results || [];
  const bySlug = {};
  for (const row of rows) bySlug[row.slug] = row;

  if (!bySlug[SYSTEM_ROLE_SLUG]) {
    await db
      .prepare("INSERT INTO roles (name, slug, permissions, is_system, rank) VALUES (?, ?, ?, ?, ?)")
      .bind("Yönetici", SYSTEM_ROLE_SLUG, JSON.stringify(ALL_PERMISSION_KEYS), 1, OWNER_ROLE_RANK)
      .run();
  } else {
    await db
      .prepare("UPDATE roles SET name = ?, permissions = ?, is_system = 1, rank = ? WHERE slug = ?")
      .bind("Yönetici", JSON.stringify(ALL_PERMISSION_KEYS), OWNER_ROLE_RANK, SYSTEM_ROLE_SLUG)
      .run();
  }
}

async function seedDefaultAdmin(db) {
  const userCount = await db.prepare("SELECT COUNT(*) as c FROM users").first();
  if (userCount && userCount.c > 0) return;

  const env = getEnv();
  const configuredPassword = typeof env.ADMIN_INITIAL_PASSWORD === "string" ? env.ADMIN_INITIAL_PASSWORD.trim() : "";
  const initialPassword = configuredPassword || "admin123";

  console.info(
    `[nebulon] İlk yönetici hesabı oluşturuldu -> kullanıcı adı: "admin", şifre: "${initialPassword}". ` +
      "Girişten sonra bu şifreyi değiştirin."
  );
  const salt = generateSalt();
  const passwordHash = await hashPassword(initialPassword, salt);

  await db
    .prepare(
      "INSERT INTO users (username, email, password_hash, salt, role, token_version, full_access) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind("admin", "admin@nebulonproject.com", passwordHash, salt, SYSTEM_ROLE_SLUG, 1, 1)
    .run();
}

async function runMigrations(db) {
  for (const sql of NEW_TABLES) {
    await db.prepare(sql).run();
  }

  for (const sql of NEW_TRIGGERS) {
    try {
      await db.prepare(sql).run();
    } catch (err) {
      console.warn("[nebulon] trigger kurulumu başarısız:", err?.message || err);
    }
  }

  await migrateUsers(db);
  await migrateRoles(db);
  await migrateCategories(db);
  await migrateAuditLogs(db);
  await migrateContactSection(db);
  await migrateTeam(db);
  await migrateProducts(db);

  for (const sql of NEW_INDEXES) {
    try {
      await db.prepare(sql).run();
    } catch (err) {
      console.warn("[nebulon] index kurulumu başarısız:", err?.message || err);
    }
  }

  await seedRoles(db);
  await seedDefaultAdmin(db);
}

async function readSchemaVersion(db) {
  try {
    const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind("schema_version").first();
    return row?.value ?? null;
  } catch (err) {

    return null;
  }
}

async function writeSchemaVersion(db) {
  await db
    .prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
    )
    .bind("schema_version", String(SCHEMA_VERSION))
    .run();
}

async function ensureSchema() {
  if (globalThis.__nebulon_v3_db_initialized) return;

  if (!globalThis.__nebulon_v3_db_init_promise) {
    const db = getDB();
    globalThis.__nebulon_v3_db_init_promise = (async () => {

      const currentVersion = await readSchemaVersion(db);
      if (currentVersion === String(SCHEMA_VERSION)) {
        const missing = await missingTables(db).catch(() => REQUIRED_TABLES);
        if (missing.length === 0) {
          globalThis.__nebulon_v3_db_initialized = true;
          return;
        }
        console.warn("[nebulon] eksik tablolar yeniden olusturuluyor:", missing.join(", "));
      }

      await runMigrations(db);
      await writeSchemaVersion(db);
      globalThis.__nebulon_v3_db_initialized = true;
    })().catch((err) => {

      globalThis.__nebulon_v3_db_init_promise = null;
      throw err;
    });
  }

  await globalThis.__nebulon_v3_db_init_promise;
}

export async function query(sql, params = []) {
  await ensureSchema();
  const db = getDB();
  const stmt = db.prepare(sql).bind(...params);
  const result = await stmt.all();
  return result.results || [];
}

export async function queryOne(sql, params = []) {
  await ensureSchema();
  const db = getDB();
  const stmt = db.prepare(sql).bind(...params);
  return stmt.first();
}

export async function execute(sql, params = []) {
  await ensureSchema();
  const db = getDB();
  const stmt = db.prepare(sql).bind(...params);
  return stmt.run();
}

export async function batch(statements) {
  await ensureSchema();
  const db = getDB();
  const prepared = statements.map(([sql, params = []]) => db.prepare(sql).bind(...params));
  return db.batch(prepared);
}

export async function getSetting(key) {
  const row = await queryOne("SELECT value FROM settings WHERE key = ?", [key]);
  return row?.value ?? null;
}

export async function setSetting(key, value) {
  const existing = await queryOne("SELECT key FROM settings WHERE key = ?", [key]);
  if (existing) {
    await execute("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = ?", [
      value,
      key
    ]);
  } else {
    await execute("INSERT INTO settings (key, value) VALUES (?, ?)", [key, value]);
  }
}

const PERMISSION_EPOCH_KEY = "permission_epoch";

export async function getPermissionEpoch() {
  const value = await getSetting(PERMISSION_EPOCH_KEY);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function bumpPermissionEpoch() {
  const next = (await getPermissionEpoch()) + 1;
  await setSetting(PERMISSION_EPOCH_KEY, String(next));
  return next;
}

export async function writeAuditLog(user, action, entityType = null, entityId = null, details = null) {
  try {
    await execute(
      "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        user?.id ?? null,
        action,
        entityType,
        entityId ?? null,
        details ? JSON.stringify(details) : null,
        user?.ip ?? null,
        user?.userAgent ?? null
      ]
    );
  } catch (err) {
    console.warn("[nebulon] audit log yazılamadı:", err?.message || err);
  }
}
