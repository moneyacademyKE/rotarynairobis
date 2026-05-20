-- ─── Epochal Time Schema (Rich Hickey Quality) ──────────────────────
-- We never drop tables. Facts are immutable.
-- Mutations arrive as appended rows, and views resolve the current state.

-- 1. Create Fact Tables (Append-Only)
CREATE TABLE IF NOT EXISTS media_facts (
    tx_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    type TEXT,
    snippet TEXT,
    raw_data TEXT,
    is_retraction BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts_facts (
    tx_id INTEGER PRIMARY KEY AUTOINCREMENT,
    id INTEGER NOT NULL,
    text TEXT,
    account TEXT,
    photos_json TEXT,
    hashtags_json TEXT,
    is_retraction BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_raw_facts (
    tx_id INTEGER PRIMARY KEY AUTOINCREMENT,
    update_id INTEGER UNIQUE NOT NULL,
    raw_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Current State Views (Resolves Epochal Time)
DROP VIEW IF EXISTS media;
CREATE VIEW media AS
SELECT tx_id as id, file_name, type, snippet, raw_data
FROM (
    SELECT *, ROW_NUMBER() OVER(PARTITION BY file_name ORDER BY tx_id DESC) as rn
    FROM media_facts
)
WHERE rn = 1 AND is_retraction = 0;

DROP VIEW IF EXISTS posts;
CREATE VIEW posts AS
SELECT id, text, account, photos_json, hashtags_json, created_at
FROM (
    SELECT *, ROW_NUMBER() OVER(PARTITION BY id ORDER BY tx_id DESC) as rn
    FROM posts_facts
)
WHERE rn = 1 AND is_retraction = 0;

-- 3. Transparent Mutation Triggers (Connects legacy INSERTs to Fact Ledgers)
DROP TRIGGER IF EXISTS insert_media_fact;
CREATE TRIGGER insert_media_fact
INSTEAD OF INSERT ON media
BEGIN
    INSERT INTO media_facts (file_name, type, snippet, raw_data)
    VALUES (NEW.file_name, NEW.type, NEW.snippet, NEW.raw_data);
END;

DROP TRIGGER IF EXISTS insert_posts_fact;
CREATE TRIGGER insert_posts_fact
INSTEAD OF INSERT ON posts
BEGIN
    INSERT INTO posts_facts (id, text, account, photos_json, hashtags_json)
    VALUES (NEW.id, NEW.text, NEW.account, NEW.photos_json, NEW.hashtags_json);
END;

-- 4. Indexes for View Performance
CREATE INDEX IF NOT EXISTS idx_media_facts_entity ON media_facts(file_name, tx_id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_facts_entity ON posts_facts(id, tx_id DESC);

-- View indexes are virtual, so we index the underlying facts that build the view bounds.
CREATE INDEX IF NOT EXISTS idx_media_facts_type ON media_facts(type);
CREATE INDEX IF NOT EXISTS idx_posts_facts_account ON posts_facts(account);
CREATE INDEX IF NOT EXISTS idx_telegram_raw_update_id ON telegram_raw_facts(update_id);


