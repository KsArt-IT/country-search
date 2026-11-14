import type { CountryResponse } from './country-response';
import type { ViewState } from './view-state';

/** Same contract as `searchCountries`. */
export type SearchFn = (query: string, signal: AbortSignal) => Promise<CountryResponse[]>;

export const DEFAULT_DEBOUNCE_MS = 300;

export interface SearchControllerOptions {
  search: SearchFn;
  debounceMs?: number;
}

export interface SearchController {
  getState(): ViewState;
  /** Calls the listener right away with the current state, then on every change. Returns an unsubscribe function. */
  subscribe(listener: (state: ViewState) => void): () => void;
  /** Call on EVERY change of the input field. */
  input(text: string): void;
  /** Repeats the query stored in the `error` state. No-op in any other state. */
  retry(): void;
  /** Opens the card with this alpha-3 code. No-op unless the state is `results` and the code exists. */
  openDetails(code: string): void;
  /** Back from `details` to `results`. No-op in any other state. */
  closeDetails(): void;
}

export const createSearchController = (_options: SearchControllerOptions): SearchController => {
  // TODO: implement (TDD stub)
  throw new Error('Not implemented');
};
