import type { CountryResponse } from './country-response';

/** countries.dev search endpoint: `GET {COUNTRIES_API_URL}/{query}`. */
export const COUNTRIES_API_URL = 'https://countries.dev/name';

/**
 * How long we wait for the server before treating the request as failed
 * (TimeoutError). Long enough for a slow mobile network, short enough that
 * the user is not left with a spinner forever.
 */
export const DEFAULT_TIMEOUT_MS = 10_000;

export const searchCountries = (
  _query: string,
  _signal: AbortSignal,
  _timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<CountryResponse[]> => {
  // TODO: implement (TDD stub)
  return Promise.reject(new Error('Not implemented'));
};
