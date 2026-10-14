import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
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
  return loadDatabaseFromBytes(new Uint8Array(await res.arrayBuffer()));
}

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
