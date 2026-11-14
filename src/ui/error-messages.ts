import type { ViewState } from '../core/view-state';

export type ErrorState = Extract<ViewState, { status: 'error' }>;

/** One message per kind of failure: the user sees WHAT went wrong, not just "error". */
export const ERROR_MESSAGES: Record<ErrorState['kind'], string> = {
  timeout: 'The server did not respond in time.',
  network: 'No connection. Check your internet and try again.',
  http: 'The server returned an error. Please try again later.',
  unknown: 'Something went wrong.',
};
