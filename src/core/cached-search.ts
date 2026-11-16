import type { SearchFn } from './search-controller';

/**
 * Wraps a search function with a cache and with sharing of in-flight requests.
 * Same signature as the wrapped function, so it can be used instead of it.
 */
export const createCachedSearch = (_search: SearchFn): SearchFn => {
  // TODO: implement (TDD stub)
  throw new Error('Not implemented');
};
