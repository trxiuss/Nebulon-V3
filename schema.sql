PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  permissions TEXT NOT NULL DEFAULT '[]',
  is_system INTEGER NOT NULL DEFAULT 0 CHECK(is_system IN (0,1)),
  rank INTEGER NOT NULL DEFAULT 100,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  email_hash TEXT,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'yonetici',
  token_version INTEGER NOT NULL DEFAULT 1,
  full_access INTEGER NOT NULL DEFAULT 0 CHECK(full_access IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (role) REFERENCES roles(slug) ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_tr TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  description_tr TEXT,
  description_en TEXT,
  icon_key TEXT,
  display_order INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER DEFAULT NULL,
  title_tr TEXT NOT NULL,
  title_en TEXT,
  short_desc_tr TEXT,
  short_desc_en TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  image_type TEXT NOT NULL DEFAULT 'url' CHECK(image_type IN ('url','preset')),
  image_value TEXT,
  download_count INTEGER,
  counter_api_url TEXT,
  count_icon_type TEXT NOT NULL DEFAULT 'download' CHECK(count_icon_type IN ('download','eye')),
  pricing_type TEXT NOT NULL DEFAULT 'free' CHECK(pricing_type IN ('free','paid')),
  action_type TEXT NOT NULL DEFAULT 'download' CHECK(action_type IN ('download','view','purchase','github')),
  action_icon_type TEXT NOT NULL DEFAULT 'download',
  action_url TEXT,
  tech_tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS team (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role_tr TEXT,
  role_en TEXT,
  avatar_url TEXT,
  socials TEXT NOT NULL DEFAULT '{}',
  display_order INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contact_section (
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
);

CREATE TABLE IF NOT EXISTS footer_icons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  icon_key TEXT NOT NULL,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(display_order);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_team_order ON team(display_order);
CREATE INDEX IF NOT EXISTS idx_footer_icons_order ON footer_icons(display_order);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

CREATE TRIGGER IF NOT EXISTS trg_users_last_admin_delete
BEFORE DELETE ON users
WHEN OLD.role = 'yonetici' AND (SELECT COUNT(*) FROM users WHERE role = 'yonetici') <= 1
BEGIN SELECT RAISE(ABORT, 'last_admin_protected'); END;

CREATE TRIGGER IF NOT EXISTS trg_users_last_admin_demote
BEFORE UPDATE OF role ON users
WHEN OLD.role = 'yonetici' AND NEW.role <> 'yonetici' AND (SELECT COUNT(*) FROM users WHERE role = 'yonetici') <= 1
BEGIN SELECT RAISE(ABORT, 'last_admin_protected'); END;

CREATE TRIGGER IF NOT EXISTS trg_roles_system_delete
BEFORE DELETE ON roles
WHEN OLD.slug = 'yonetici' OR OLD.is_system = 1
BEGIN SELECT RAISE(ABORT, 'system_role_protected'); END;

CREATE TRIGGER IF NOT EXISTS trg_roles_system_change
BEFORE UPDATE OF slug, is_system ON roles
WHEN OLD.slug = 'yonetici' OR OLD.is_system = 1
BEGIN
  SELECT CASE WHEN NEW.slug <> 'yonetici' OR NEW.is_system <> 1 THEN RAISE(ABORT, 'system_role_protected') END;
END;

CREATE TABLE IF NOT EXISTS auth_logs (
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
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_created ON auth_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_logs_user ON auth_logs(user_id);
