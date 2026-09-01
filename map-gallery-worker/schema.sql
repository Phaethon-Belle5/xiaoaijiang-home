-- map-gallery-db schema
CREATE TABLE IF NOT EXISTS cities (
  city_key      TEXT PRIMARY KEY,   -- adcode_name, e.g. 370100_济南市
  name          TEXT NOT NULL,
  adcode        TEXT,
  lng           REAL,
  lat           REAL,
  rating        INTEGER DEFAULT 0,  -- 0-5
  description   TEXT DEFAULT '',
  visit_months  TEXT DEFAULT '[]',  -- JSON array of 'YYYY-MM'
  tags          TEXT DEFAULT '[]',  -- JSON array of {text,category}
  cover_r2_key  TEXT DEFAULT '',    -- R2 key OR external URL used as cover
  is_hometown   INTEGER DEFAULT 0,
  updated_at    INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS photos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  city_key    TEXT,                 -- nullable = unlocated
  r2_key      TEXT DEFAULT '',      -- '' when url is external (migrated)
  url         TEXT NOT NULL,
  caption     TEXT DEFAULT '',
  date        TEXT DEFAULT '',
  ord         INTEGER DEFAULT 0,
  created_at  INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_photos_city ON photos(city_key);
CREATE INDEX IF NOT EXISTS idx_photos_ord ON photos(ord);

CREATE TABLE IF NOT EXISTS attractions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  city_key    TEXT NOT NULL,
  name        TEXT NOT NULL,
  visit_date  TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  ord         INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_attr_city ON attractions(city_key);

CREATE TABLE IF NOT EXISTS attraction_photos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  attraction_id  INTEGER NOT NULL,
  r2_key         TEXT DEFAULT '',
  url            TEXT NOT NULL,
  ord            INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_attrphoto_attr ON attraction_photos(attraction_id);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  expires_at  INTEGER NOT NULL
);

-- 站点访问统计：pv/uv 计数（真实累计，从 0 起）
CREATE TABLE IF NOT EXISTS site_stats (
  key  TEXT PRIMARY KEY,   -- 'pv' | 'uv'
  val  INTEGER DEFAULT 0
);
INSERT OR IGNORE INTO site_stats(key,val) VALUES ('pv',0),('uv',0);

-- 独立访客去重（浏览器本地匿名 ID）
CREATE TABLE IF NOT EXISTS visitors (
  vid       TEXT PRIMARY KEY,
  first_at  INTEGER NOT NULL
);
