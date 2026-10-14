import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs, { type Database } from 'sql.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// test/fixtures -> test -> librarian -> apps -> web -> <repo root>
const REPO_ROOT = path.resolve(HERE, '../../../../..');
const SCHEMA_PATH = path.join(REPO_ROOT, 'pipeline', 'schema.sql');

/**
 * Builds a tiny in-memory SQLite database against the *real*
 * pipeline/schema.sql (so these tests fail loudly if the schema drifts) and
 * seeds a handful of hand-picked rows covering samples, detections,
 * substances with overlapping classes, and both sample- and reference-role
 * spectra across all three techniques.
 *
 * The two `CREATE VIRTUAL TABLE ... USING fts5(...)` statements are stripped
 * before running the schema: the officially published sql.js wasm binary
 * (unlike CPython's sqlite3, which pipeline/build_db.py uses) is built
 * without the FTS5 module, so *creating* an fts5 table from scratch throws
 * immediately ("no such module: fts5") -- this is a genuine constraint of
 * running SQLite-in-WASM, not a fixture bug. It does NOT stop the real app
 * from working: sql.js can still *open* a real .sqlite file that already
 * contains populated fts5 tables (SQLite only invokes the module when a
 * table is referenced by a query, not merely by opening the file), it just
 * can't run `MATCH` queries against them -- see src/db/queries.ts
 * (searchSamplesFts/searchSubstancesFts + substanceIdsMatchingText) for how
 * the app degrades gracefully to substring search instead. This fixture
 * mirrors that reality by never creating the fts5 tables, so the same
 * fallback code paths are what get exercised here too.
 */
export async function makeTestDb(): Promise<Database> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  const schema = readFileSync(SCHEMA_PATH, 'utf-8').replace(
    /CREATE VIRTUAL TABLE IF NOT EXISTS \w+ USING fts5\([^;]*\);/g,
    '',
  );
  db.run(schema);

  db.run(`INSERT INTO sources (source_id, name, url, license, terms, fetched_at)
          VALUES ('test-source', 'Test Source', 'https://example.test', 'CC-BY', 'test terms', '2026-01-01T00:00:00Z')`);

  db.run(`INSERT INTO substances (substance_id, name, pronunciation, pubchem_cid, cas, unii, common_role, classes) VALUES
    (1, 'Fentanyl', 'FEN-tuh-nil', '3345', '437-38-7', 'UF589814EK', 'opioid', '["fentanyl_impurities","opiates_opioids"]'),
    (2, 'Xylazine', 'ZY-luh-zeen', '5707', '7361-61-7', 'X6F1O99Q4R', 'sedative', '["common_cuts"]'),
    (3, 'Methamphetamine', 'meth-am-FET-uh-meen', '10836', '537-46-2', NULL, 'stimulant', '["meth_impurities"]')`);

  db.run(`INSERT INTO samples (sample_id, source_id, external_id, program, state, county_fips, date_collected, expected, color, texture, notes) VALUES
    ('S1', 'test-source', 'ext-1', 'ProgramA', 'NC', '37021', '20Oct2022', 'heroin; fentanyl', 'black', 'chunky', 'strong smell'),
    ('S2', 'test-source', 'ext-2', 'ProgramB', 'NY', '36001', '01May2022', 'methamphetamine', 'clear', 'crystal', NULL)`);

  db.run(`INSERT INTO detections (sample_id, substance_id, method, abundance, rt, confidence) VALUES
    ('S1', 1, 'GCMS', NULL, 12.4, 'primary'),
    ('S1', 2, 'GCMS', NULL, 8.1, 'trace'),
    ('S2', 3, 'GCMS', NULL, 6.7, 'primary')`);

  db.run(`INSERT INTO spectra (sample_id, substance_id, technique, role, format_origin, peaks, meta, raw) VALUES
    ('S1', 1, 'GCMS', 'sample', 'mzML', '[[1,2],[2,10],[3,4]]', '{"note":"chromatogram"}', NULL),
    (NULL, 1, 'MS', 'reference', 'MSP', '[[100,10],[200,100],[300,20]]', '{"source":"SWGDRUG"}', NULL),
    (NULL, 3, 'FTIR', 'reference', 'JCAMP-DX', '[[400,0.1],[1500,0.9],[4000,0.05]]', '{"library":"NIST WebBook"}', NULL)`);

  // No substances_fts/samples_fts inserts here -- those virtual tables were
  // stripped above (see the doc comment for why) and don't exist in this
  // fixture's schema.

  return db;
}
