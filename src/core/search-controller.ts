import { classifyError } from './classify-error';
import type { CountryResponse } from './country-response';
import { debounce } from './debounce';
import { mapCountryResponse } from './map-country-response';
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

const IDLE: ViewState = { status: 'idle' };

export const createSearchController = ({
  search,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: SearchControllerOptions): SearchController => {
  let state: ViewState = IDLE;
  let activeRequest: AbortController | null = null;
  const listeners = new Set<(state: ViewState) => void>();

  const setState = (next: ViewState): void => {
    if (next === state) return;
    state = next;
    for (const listener of [...listeners]) listener(state);
  };

  const abortActiveRequest = (): void => {
    activeRequest?.abort();
    activeRequest = null;
  };

  const startRequest = (query: string): void => {
    const request = new AbortController();
    activeRequest = request;

    search(query, request.signal).then(
      (countries) => {
        setState(
          countries.length === 0
            ? { status: 'empty', query }
            : { status: 'results', query, cards: countries.map(mapCountryResponse) },
        );
      },
      (error: unknown) => {
        const kind = classifyError(error);
        if (kind === 'aborted') return;
        setState({ status: 'error', query, kind });
      },
    );
  };

  // debounce keeps the arguments of the LAST call, so an empty query (see `input`)
  // replaces a pending one, and `run` has nothing to do for it.
  const run = (query: string): void => {
    if (query === '') return;
    startRequest(query);
  };
  const debouncedRun = debounce(run, debounceMs);

  return {
    getState: () => state,

    subscribe: (listener) => {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },

    input: (text) => {
      const query = text.trim();
      abortActiveRequest();
      setState(query === '' ? IDLE : { status: 'loading', query });
      debouncedRun(query);
    },

    retry: () => {
      if (state.status !== 'error') return;
      const { query } = state;
      setState({ status: 'loading', query });
      startRequest(query);
    },

    openDetails: (code) => {
      if (state.status !== 'results') return;
      const { query, cards } = state;
      const selected = cards.find((card) => card.code === code);
      if (!selected) return;
      setState({ status: 'details', query, cards, selected });
    },

    closeDetails: () => {
      if (state.status !== 'details') return;
      const { query, cards } = state;
      setState({ status: 'results', query, cards });
    },
  };
};
