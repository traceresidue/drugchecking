import { describe, expect, it } from 'vitest';
import { OverlayStore, type OverlayStorage } from '../src/lib/overlay';

function memoryStorage(): OverlayStorage {
  const mem = new Map<string, string>();
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => {
      mem.set(k, v);
    },
  };
}

describe('lib/overlay OverlayStore', () => {
  it('starts empty and never touches a real DB -- only the injected storage', () => {
    const store = new OverlayStore(memoryStorage());
    expect(store.list()).toEqual([]);
  });

  it('creates, lists, and removes libraries', () => {
    const store = new OverlayStore(memoryStorage());

    const lib = store.create('NC fentanyl Q2', ['S1', 'S2'], [10, 11]);
    expect(lib.name).toBe('NC fentanyl Q2');
    expect(lib.sampleIds).toEqual(['S1', 'S2']);
    expect(lib.spectrumIds).toEqual([10, 11]);
    expect(store.list()).toHaveLength(1);

    const lib2 = store.create('Second library', ['S3'], []);
    expect(store.list()).toHaveLength(2);

    store.remove(lib.id);
    const remaining = store.list();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.id).toBe(lib2.id);
  });

  it('save() upserts by id rather than duplicating', () => {
    const store = new OverlayStore(memoryStorage());
    const lib = store.create('Draft', ['S1'], []);
    store.save({ ...lib, name: 'Renamed', sampleIds: ['S1', 'S2'] });

    const all = store.list();
    expect(all).toHaveLength(1);
    expect(all[0]!.name).toBe('Renamed');
    expect(all[0]!.sampleIds).toEqual(['S1', 'S2']);
  });

  it('is resilient to corrupted storage contents', () => {
    const storage = memoryStorage();
    storage.setItem('dcf-librarian:libraries:v1', 'not json{{{');
    const store = new OverlayStore(storage);
    expect(store.list()).toEqual([]);
  });
});
