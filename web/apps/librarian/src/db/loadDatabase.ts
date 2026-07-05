import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
// Vite asset import: resolves to a hashed URL at build time, no hand-copying
// wasm into public/. See README.md "Data flow" for the two DB-loading paths.
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({ locateFile: () => sqlWasmUrl });
  }
  return sqlJsPromise;
}

export async function loadDatabaseFromBytes(bytes: Uint8Array): Promise<Database> {
  const SQL = await getSqlJs();
  return new SQL.Database(bytes);
}

export async function loadDatabaseFromUrl(url: string): Promise<Database> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  return loadDatabaseFromBytes(bytes);
}

export async function loadDatabaseFromFile(file: File): Promise<Database> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return loadDatabaseFromBytes(bytes);
}

/**
 * Best-effort auto-load of the DB copied into public/ by scripts/copy-db.mjs
 * (see package.json predev/prebuild). Returns null (never throws) if it's
 * not there -- callers should fall back to the file-picker, which is the
 * path that always works.
 */
export async function tryLoadDefaultDatabase(): Promise<Database | null> {
  const url = `${import.meta.env.BASE_URL}drugchecking.sqlite`;
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) return null;
    return await loadDatabaseFromUrl(url);
  } catch {
    return null;
  }
}
