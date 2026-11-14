import { HttpError } from './http-error';

export type ErrorKind = 'aborted' | 'timeout' | 'http' | 'network' | 'unknown';

const getName = (error: unknown): unknown =>
  typeof error === 'object' && error !== null ? (error as { name?: unknown }).name : undefined;

/**
 * Tells what went wrong with a failed request, so the caller can pick a reaction
 * (stay silent for `aborted`, show an error with a retry button for the rest).
 *
 * - `aborted` / `timeout` are recognized by `name`, not by `instanceof DOMException`
 *   or by message, so errors from other realms and wrappers work too.
 * - `network` is any `TypeError`: fetch rejects with it in every browser, only the
 *   text differs. This is safe as long as the `try` wraps just `searchCountries`.
 * - Never throws: any thrown value is accepted.
 */
export const classifyError = (error: unknown): ErrorKind => {
  if (error instanceof HttpError) return 'http';

  const name = getName(error);
  if (name === 'AbortError') return 'aborted';
  if (name === 'TimeoutError') return 'timeout';

  if (error instanceof TypeError) return 'network';

  return 'unknown';
};
