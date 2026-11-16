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

export const createSearchHistory = (
  _storage: HistoryStorage,
  _options: SearchHistoryOptions = {},
): SearchHistory => {
  // TODO: implement (TDD stub)
  throw new Error('Not implemented');
};
