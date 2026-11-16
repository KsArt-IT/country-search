import type { CountryResponse } from './country-response';
import type { SearchFn } from './search-controller';

interface InFlightRequest {
  promise: Promise<CountryResponse[]>;
  controller: AbortController;
  waiting: number;
}

/**
 * Wraps a search function with a cache and with sharing of in-flight requests.
 * Same signature as the wrapped function, so it can be used instead of it.
 *
 * - Keys are lower-cased: the API does not care about the case of the query.
 * - Only successful answers are cached (an empty array too: "nothing found").
 * - Callers asking for a query that is already in flight share one request, but
 *   each keeps its own cancellation: aborting one rejects only that caller. The
 *   real request is aborted when the LAST waiting caller has aborted.
 * - Every caller gets the same array: it must be treated as read-only.
 */
export const createCachedSearch = (search: SearchFn): SearchFn => {
  const results = new Map<string, CountryResponse[]>();
  const inFlight = new Map<string, InFlightRequest>();

  const startRequest = (key: string, query: string): InFlightRequest => {
    const controller = new AbortController();

    // Only the entry that is still registered may touch the maps: after a full
    // cancel a newer request for the same key can already be there.
    const promise = search(query, controller.signal).then(
      (countries) => {
        if (inFlight.get(key) === request) {
          inFlight.delete(key);
          results.set(key, countries);
        }
        return countries;
      },
      (error: unknown) => {
        if (inFlight.get(key) === request) inFlight.delete(key);
        throw error as Error;
      },
    );

    const request: InFlightRequest = { promise, controller, waiting: 0 };
    inFlight.set(key, request);
    return request;
  };

  return (query, signal) =>
    new Promise<CountryResponse[]>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason as Error);
        return;
      }

      const key = query.toLowerCase();

      const cached = results.get(key);
      if (cached !== undefined) {
        resolve(cached);
        return;
      }

      const request = inFlight.get(key) ?? startRequest(key, query);
      request.waiting++;

      const onAbort = (): void => {
        request.waiting--;
        if (request.waiting === 0) {
          // Forget the request first, so the next caller starts a new one
          // instead of joining a request that is being aborted.
          if (inFlight.get(key) === request) inFlight.delete(key);
          request.controller.abort();
        }
        reject(signal.reason as Error);
      };
      signal.addEventListener('abort', onAbort, { once: true });

      request.promise.then(
        (countries) => {
          signal.removeEventListener('abort', onAbort);
          resolve(countries);
        },
        (error: Error) => {
          signal.removeEventListener('abort', onAbort);
          reject(error);
        },
      );
    });
};
