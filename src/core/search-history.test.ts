import { describe, expect, it } from 'vitest';
import {
  createSearchHistory,
  DEFAULT_HISTORY_KEY,
  DEFAULT_HISTORY_LIMIT,
  type HistoryStorage,
} from './search-history';

/** An in-memory storage; `data` lets a test look at (or prepare) the raw values. */
const createMemoryStorage = (
  initial: Record<string, string> = {},
): HistoryStorage & { data: Record<string, string> } => {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
};

const brokenStorage = (broken: { read?: boolean; write?: boolean }): HistoryStorage => ({
  getItem: () => {
    if (broken.read) throw new Error('storage is not available');
    return null;
  },
  setItem: () => {
    if (broken.write) throw new DOMException('Quota exceeded', 'QuotaExceededError');
  },
});

describe('createSearchHistory', () => {
  describe('adding and reading', () => {
    it('is empty when nothing was stored', () => {
      expect(createSearchHistory(createMemoryStorage()).get()).toEqual([]);
    });

    it('returns an added query', () => {
      const history = createSearchHistory(createMemoryStorage());

      history.add('spain');

      expect(history.get()).toEqual(['spain']);
    });

    it('puts the newest query first', () => {
      const history = createSearchHistory(createMemoryStorage());

      history.add('spain');
      history.add('ukraine');
      history.add('poland');

      expect(history.get()).toEqual(['poland', 'ukraine', 'spain']);
    });

    it('trims the query before storing it', () => {
      const history = createSearchHistory(createMemoryStorage());

      history.add('  spain ');

      expect(history.get()).toEqual(['spain']);
    });

    it.each(['', '   '])('ignores an empty query (%j)', (query) => {
      const history = createSearchHistory(createMemoryStorage());

      history.add(query);

      expect(history.get()).toEqual([]);
    });
  });

  describe('case', () => {
    // Decision: the history is lower-cased when stored. It is simpler and matches
    // the keys of the search cache, where "Spain" and "spain" are one query.
    it('stores a query in lower case', () => {
      const history = createSearchHistory(createMemoryStorage());

      history.add('Spain');

      expect(history.get()).toEqual(['spain']);
    });
  });

  describe('duplicates', () => {
    it('moves a repeated query to the top instead of adding it twice', () => {
      const history = createSearchHistory(createMemoryStorage());
      history.add('spain');
      history.add('ukraine');

      history.add('spain');

      expect(history.get()).toEqual(['spain', 'ukraine']);
    });

    it('treats queries that differ only in case as the same one', () => {
      const history = createSearchHistory(createMemoryStorage());
      history.add('spain');
      history.add('ukraine');

      history.add('SPAIN');

      expect(history.get()).toEqual(['spain', 'ukraine']);
    });

    it('also ignores whitespace when looking for a duplicate', () => {
      const history = createSearchHistory(createMemoryStorage());
      history.add('spain');

      history.add(' spain ');

      expect(history.get()).toEqual(['spain']);
    });
  });

  describe('limit', () => {
    it('keeps only the last DEFAULT_HISTORY_LIMIT queries by default', () => {
      const history = createSearchHistory(createMemoryStorage());
      const queries = Array.from({ length: DEFAULT_HISTORY_LIMIT + 1 }, (_, index) => `q${index}`);

      queries.forEach((query) => history.add(query));

      expect(history.get()).toEqual(queries.slice(1).reverse());
    });

    it('keeps the number of queries given in the options', () => {
      const history = createSearchHistory(createMemoryStorage(), { limit: 2 });

      ['a', 'b', 'c'].forEach((query) => history.add(query));

      expect(history.get()).toEqual(['c', 'b']);
    });

    it('does not drop anything when a repeated query moves to the top', () => {
      const history = createSearchHistory(createMemoryStorage(), { limit: 3 });
      ['a', 'b', 'c'].forEach((query) => history.add(query));

      history.add('a');

      expect(history.get()).toEqual(['a', 'c', 'b']);
    });

    it('cuts a longer stored list to the limit when reading', () => {
      const storage = createMemoryStorage({ [DEFAULT_HISTORY_KEY]: '["a","b","c","d"]' });

      expect(createSearchHistory(storage, { limit: 2 }).get()).toEqual(['a', 'b']);
    });
  });

  describe('storage', () => {
    it('survives a "reload": another instance on the same storage sees the queries', () => {
      const storage = createMemoryStorage();
      createSearchHistory(storage).add('spain');

      expect(createSearchHistory(storage).get()).toEqual(['spain']);
    });

    it('reads a list written as a JSON array under the default key', () => {
      const storage = createMemoryStorage({ [DEFAULT_HISTORY_KEY]: '["spain","ukraine"]' });

      expect(createSearchHistory(storage).get()).toEqual(['spain', 'ukraine']);
    });

    it('uses the key from the options and does not mix keys up', () => {
      const storage = createMemoryStorage();
      createSearchHistory(storage, { key: 'one' }).add('spain');

      expect(createSearchHistory(storage, { key: 'one' }).get()).toEqual(['spain']);
      expect(createSearchHistory(storage, { key: 'two' }).get()).toEqual([]);
      expect(createSearchHistory(storage).get()).toEqual([]);
    });

    it('returns a copy: changing the result does not change the history', () => {
      const history = createSearchHistory(createMemoryStorage());
      history.add('spain');

      history.get().push('hacked');

      expect(history.get()).toEqual(['spain']);
    });
  });

  describe('damaged or unexpected data', () => {
    it.each([
      ['broken JSON', 'not json'],
      ['an object', '{"a":1}'],
      ['a string', '"spain"'],
      ['a number', '42'],
      ['null', 'null'],
      ['an empty string', ''],
    ])('treats %s as an empty history', (_label, raw) => {
      const storage = createMemoryStorage({ [DEFAULT_HISTORY_KEY]: raw });

      expect(createSearchHistory(storage).get()).toEqual([]);
    });

    it('keeps only the strings of a mixed array', () => {
      const storage = createMemoryStorage({
        [DEFAULT_HISTORY_KEY]: '[1,null,"spain",{},"  ","ukraine",["x"]]',
      });

      expect(createSearchHistory(storage).get()).toEqual(['spain', 'ukraine']);
    });

    it('recovers: adding to a damaged history starts a clean one', () => {
      const storage = createMemoryStorage({ [DEFAULT_HISTORY_KEY]: 'not json' });
      const history = createSearchHistory(storage);

      history.add('spain');

      expect(createSearchHistory(storage).get()).toEqual(['spain']);
    });
  });

  describe('a storage that does not work (private mode, quota)', () => {
    it('get() returns an empty list when reading throws', () => {
      const history = createSearchHistory(brokenStorage({ read: true }));

      expect(() => history.get()).not.toThrow();
      expect(history.get()).toEqual([]);
    });

    it('add() does not throw when reading throws', () => {
      const history = createSearchHistory(brokenStorage({ read: true }));

      expect(() => history.add('spain')).not.toThrow();
    });

    it('add() does not throw when writing throws', () => {
      const history = createSearchHistory(brokenStorage({ write: true }));

      expect(() => history.add('spain')).not.toThrow();
    });
  });
});
