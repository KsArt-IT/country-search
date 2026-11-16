/** The part of `Storage` the history needs, so tests can pass a fake. */
export interface HistoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SearchHistory {
  /** Recent queries, newest first. Never throws; a copy, safe to modify. */
  get(): string[];
  /** Remembers a query: moves it to the top if it is already there. Never throws. */
  add(query: string): void;
}

export interface SearchHistoryOptions {
  key?: string;
  limit?: number;
}

export const DEFAULT_HISTORY_KEY = 'country-search:history';
export const DEFAULT_HISTORY_LIMIT = 10;

/** Trimmed and lower-cased, like the keys of the search cache: "Spain" and "spain" are one query. */
const normalize = (query: string): string => query.trim().toLowerCase();

export const createSearchHistory = (
  storage: HistoryStorage,
  { key = DEFAULT_HISTORY_KEY, limit = DEFAULT_HISTORY_LIMIT }: SearchHistoryOptions = {},
): SearchHistory => {
  // The storage may be empty, damaged by hand, or not available at all (private
  // mode): in any such case the history is just empty, and the app keeps working.
  const read = (): string[] => {
    try {
      const raw = storage.getItem(key);
      if (raw === null) return [];
      const stored: unknown = JSON.parse(raw);
      if (!Array.isArray(stored)) return [];
      return stored
        .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
        .slice(0, limit);
    } catch {
      return [];
    }
  };

  const write = (queries: string[]): void => {
    try {
      storage.setItem(key, JSON.stringify(queries));
    } catch {
      // Quota exceeded or storage is blocked: losing the history is not worth a crash.
    }
  };

  return {
    // `read` builds a new array every time, so callers cannot change the history through it.
    get: read,

    add: (query) => {
      const normalized = normalize(query);
      if (normalized === '') return;

      const others = read().filter((item) => normalize(item) !== normalized);
      write([normalized, ...others].slice(0, limit));
    },
  };
};
