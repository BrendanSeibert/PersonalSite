import { describe, expect, it } from 'vitest';
import { visibleFavorites } from './favoritesList';
import { FROG_ENTRIES, type EntryId } from './frogEntries';

const ids = (entries: { id: EntryId }[]) => entries.map((entry) => entry.id);

describe('visibleFavorites', () => {
  it('lists your favorites in en.json order, whatever order they arrive in', () => {
    expect(ids(visibleFavorites(FROG_ENTRIES, ['entry07', 'entry02', 'entry15'], new Set()))).toEqual([
      'entry02',
      'entry07',
      'entry15',
    ]);
  });

  it('keeps a frog you unliked while it was shown', () => {
    expect(ids(visibleFavorites(FROG_ENTRIES, ['entry02'], new Set(['entry02', 'entry07'])))).toEqual([
      'entry02',
      'entry07',
    ]);
  });

  it('adds a frog you just liked', () => {
    expect(ids(visibleFavorites(FROG_ENTRIES, ['entry02', 'entry01'], new Set(['entry02'])))).toEqual([
      'entry01',
      'entry02',
    ]);
  });

  it('is empty with nothing liked and nothing shown', () => {
    expect(visibleFavorites(FROG_ENTRIES, [], new Set())).toEqual([]);
  });
});
