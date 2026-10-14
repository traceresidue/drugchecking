import type { OverlayLibrary } from './types';

const STORAGE_KEY = 'dcf-librarian:libraries:v1';

export interface OverlayStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function inMemoryStorage(): OverlayStorage {
  const mem = new Map<string, string>();
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => {
      mem.set(k, v);
    },
  };
}

function defaultStorage(): OverlayStorage {
  if (typeof localStorage !== 'undefined') return localStorage;
  return inMemoryStorage();
}

/**
 * Persistence choice: localStorage, not IndexedDB.
 *
 * Saved libraries only ever store ID references (sample_id[], spectrum_id[])
 * plus a name/timestamp -- never spectra payloads or the SQLite bytes -- so
 * even a few hundred libraries stay well under a few hundred KB, nowhere near
 * localStorage's ~5MB per-origin quota. That makes the synchronous
 * localStorage API a better fit than IndexedDB here: no async loading states,
 * no transactions/versioned-upgrade boilerplate, trivial to unit test (see
 * test/overlay.test.ts) by injecting an in-memory OverlayStorage. If a future
 * phase wants to cache full spectra/raw blobs in the overlay, switch this
 * class to an IndexedDB-backed implementation behind the same interface.
 *
 * Either way, the overlay is a strict one-way street: the app reads the
 * loaded SQLite database but only ever writes here. Nothing is ever written
 * back into the sql.js Database instance or the on-disk .sqlite file.
 */
export class OverlayStore {
  private storage: OverlayStorage;

  constructor(storage: OverlayStorage = defaultStorage()) {
    this.storage = storage;
  }

  list(): OverlayLibrary[] {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as OverlayLibrary[]) : [];
    } catch {
      return [];
    }
  }

  save(library: OverlayLibrary): void {
    const all = this.list().filter((l) => l.id !== library.id);
    all.push(library);
    this.storage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  remove(id: string): void {
    const all = this.list().filter((l) => l.id !== id);
    this.storage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  create(name: string, sampleIds: string[], spectrumIds: number[]): OverlayLibrary {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `lib_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const library: OverlayLibrary = {
      id,
      name,
      createdAt: new Date().toISOString(),
      sampleIds,
      spectrumIds,
    };
    this.save(library);
    return library;
  }
}
