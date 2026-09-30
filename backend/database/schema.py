SCHEMA_SQL = """
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;
PRAGMA temp_store = MEMORY;

CREATE TABLE IF NOT EXISTS business_records (
    entity_id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    business_name TEXT NOT NULL,
    business_address TEXT,
    country TEXT NOT NULL,
    normalized_name TEXT,
    normalized_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_records_source ON business_records(source);
CREATE INDEX IF NOT EXISTS idx_records_country ON business_records(country);
CREATE INDEX IF NOT EXISTS idx_records_name ON business_records(business_name);
CREATE INDEX IF NOT EXISTS idx_records_norm_name ON business_records(normalized_name);

CREATE TABLE IF NOT EXISTS candidate_pairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source1_entity_id TEXT NOT NULL,
    candidate_entity_id TEXT NOT NULL,
    candidate_source TEXT NOT NULL,
    name_similarity REAL NOT NULL,
    address_similarity REAL NOT NULL,
    combined_score REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_candidates_s1 ON candidate_pairs(source1_entity_id);
CREATE INDEX IF NOT EXISTS idx_candidates_cand ON candidate_pairs(candidate_entity_id);

CREATE TABLE IF NOT EXISTS entity_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source1_entity_id TEXT NOT NULL,
    matched_entity_id TEXT NOT NULL,
    confidence REAL NOT NULL,
    status TEXT NOT NULL,
    name_similarity REAL,
    address_similarity REAL,
    combined_score REAL
);

CREATE INDEX IF NOT EXISTS idx_matches_s1 ON entity_matches(source1_entity_id);
CREATE INDEX IF NOT EXISTS idx_matches_matched ON entity_matches(matched_entity_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON entity_matches(status);

CREATE TABLE IF NOT EXISTS dataset_statistics (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS validation_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threshold REAL NOT NULL,
    precision REAL NOT NULL,
    recall REAL NOT NULL,
    f0_5 REAL NOT NULL,
    candidate_recall REAL NOT NULL,
    true_positives INTEGER NOT NULL,
    false_positives INTEGER NOT NULL,
    false_negatives INTEGER NOT NULL,
    evaluated_entities INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""
