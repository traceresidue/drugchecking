-- drugchecking.sqlite schema v1 (ROADMAP.md Track B)
-- The queryable aggregate behind the Sample Librarian and the viz framework's
-- data/*.json exports. Every record that originates outside this repo carries
-- source_id, license/terms, and a retrieval timestamp for provenance.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sources (
  source_id   TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  url         TEXT,
  license     TEXT,
  terms       TEXT,
  fetched_at  TEXT NOT NULL  -- ISO-8601
);

-- Seeded from chemdictionary/chemdictionary.csv.
CREATE TABLE IF NOT EXISTS substances (
  substance_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL UNIQUE,
  pronunciation TEXT,
  pubchem_cid   TEXT,
  cas           TEXT,
  unii          TEXT,
  common_role   TEXT,
  classes       TEXT NOT NULL DEFAULT '[]'  -- JSON array, e.g. ["nitazenes","opiates_opioids"]
);

CREATE TABLE IF NOT EXISTS samples (
  sample_id       TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL REFERENCES sources(source_id),
  external_id     TEXT,
  program         TEXT,
  state           TEXT,
  county_fips     TEXT,
  date_collected  TEXT,
  expected        TEXT,   -- free-text write-in from the collection card
  color           TEXT,
  texture         TEXT,
  notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_samples_source ON samples(source_id);
CREATE INDEX IF NOT EXISTS idx_samples_date ON samples(date_collected);

CREATE TABLE IF NOT EXISTS detections (
  detection_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id     TEXT NOT NULL REFERENCES samples(sample_id),
  substance_id  INTEGER NOT NULL REFERENCES substances(substance_id),
  method        TEXT,          -- e.g. 'GCMS'
  abundance     REAL,          -- NULL when only primary/trace flags are known
  rt            REAL,          -- retention time, minutes; NULL if not recorded
  confidence    TEXT           -- 'primary' | 'trace'
);
CREATE INDEX IF NOT EXISTS idx_detections_sample ON detections(sample_id);
CREATE INDEX IF NOT EXISTS idx_detections_substance ON detections(substance_id);

CREATE TABLE IF NOT EXISTS spectra (
  spectrum_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id      TEXT REFERENCES samples(sample_id),
  substance_id   INTEGER REFERENCES substances(substance_id),
  technique      TEXT NOT NULL,  -- 'GCMS' | 'MS' | 'FTIR'
  role           TEXT NOT NULL,  -- 'sample' | 'reference'
  format_origin  TEXT,           -- 'mzML' | 'MSP' | 'JCAMP-DX' | ...
  peaks          TEXT,           -- JSON [[x,y],...] normalized
  meta           TEXT,           -- JSON
  raw            BLOB            -- original format chunk, for reproducibility
);
CREATE INDEX IF NOT EXISTS idx_spectra_sample ON spectra(sample_id);
CREATE INDEX IF NOT EXISTS idx_spectra_substance ON spectra(substance_id);

CREATE TABLE IF NOT EXISTS libraries (
  library_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  description  TEXT,
  created_at   TEXT NOT NULL,
  kind         TEXT
);

CREATE TABLE IF NOT EXISTS library_members (
  library_id   INTEGER NOT NULL REFERENCES libraries(library_id),
  spectrum_id  INTEGER REFERENCES spectra(spectrum_id),
  sample_id    TEXT REFERENCES samples(sample_id),
  position     INTEGER
);

-- Standalone (not external-content) FTS5 tables: substances.substance_id is an
-- INTEGER rowid alias so it could use content=, but samples.sample_id is TEXT
-- and can't be a rowid alias, so both are populated by the loader instead of
-- content-table triggers, keeping the sync mechanism identical for both.
CREATE VIRTUAL TABLE IF NOT EXISTS substances_fts USING fts5(
  name, substance_id UNINDEXED
);
CREATE VIRTUAL TABLE IF NOT EXISTS samples_fts USING fts5(
  notes, sample_id UNINDEXED
);
