import type { CountryResponse } from './country-response';
import { HttpError } from './http-error';

/** countries.dev search endpoint: `GET {COUNTRIES_API_URL}/{query}`. */
export const COUNTRIES_API_URL = 'https://countries.dev/name';

/**
 * How long we wait for the server before treating the request as failed
 * (TimeoutError). Long enough for a slow mobile network, short enough that
 * the user is not left with a spinner forever.
 */
export const DEFAULT_TIMEOUT_MS = 10_000;

const NOT_FOUND_STATUS = 404;

/**
 * Searches countries by name.
 *
 * - 404 means "no matches" for this API, so it resolves with `[]`.
 * - Any other non-ok status rejects with `HttpError`.
 * - Cancelling `signal` rejects with `AbortError`; exceeding `timeoutMs`
 *   rejects with `TimeoutError` (both are passed through from `fetch`).
 */
export const searchCountries = async (
  query: string,
  signal: AbortSignal,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<CountryResponse[]> => {
  const combinedSignal = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);

  const response = await fetch(`${COUNTRIES_API_URL}/${encodeURIComponent(query)}`, {
    signal: combinedSignal,
  });

  if (response.status === NOT_FOUND_STATUS) {
    return [];
  }
  if (!response.ok) {
    throw new HttpError(response.status);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Unexpected response: expected an array of countries');
  }

  return data as CountryResponse[];
};
