import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CountryResponse } from './country-response';
import spainJson from './fixtures/spain.json';
import ukraineJson from './fixtures/ukraine.json';
import { mapCountryResponse } from './map-country-response';
import { createSearchController, type SearchController } from './search-controller';
import { COUNTRIES_API_URL, searchCountries } from './search-countries';
import type { ViewState } from './view-state';

/**
 * The race: the user types "sp", then "spain". If the answer to "sp" arrives AFTER
 * the answer to "spain", it must not overwrite the screen.
 *
 * The whole chain is real (controller -> searchCountries -> AbortController); only
 * `fetch` is replaced. The fake reacts to the signal like the real one: when the
 * request is aborted its promise is rejected with the signal's reason (AbortError).
 * That is what tells real cancellation from "the app just ignored a stale answer":
 * if the controller forgot to call abort(), the stale promise stays alive here,
 * resolves late and the tests below go red.
 */

const DEBOUNCE_MS = 300;

const spainRaw = (spainJson as CountryResponse[])[0];
const ukraineRaw = (ukraineJson as CountryResponse[])[0];
const spainCard = mapCountryResponse(spainRaw);

interface FetchCall {
  query: string;
  signal: AbortSignal;
  /** What the promise was rejected with because of abort(); undefined while it was not aborted. */
  abortReason: unknown;
  /** The server answers. A no-op if the request was already aborted, as with the real fetch. */
  respond: (body: unknown, status?: number) => void;
}

type FakeFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

const createFakeFetch = (): { fetchMock: FakeFetch; calls: FetchCall[] } => {
  const calls: FetchCall[] = [];

  const fetchMock = (input: string | URL, init?: RequestInit): Promise<Response> =>
    new Promise<Response>((resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error('fetch was called without a signal'));
        return;
      }

      const call: FetchCall = {
        query: decodeURIComponent(String(input).slice(COUNTRIES_API_URL.length + 1)),
        signal,
        abortReason: undefined,
        respond: (body, status = 200) =>
          resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response),
      };
      calls.push(call);

      const onAbort = (): void => {
        call.abortReason = signal.reason;
        reject(signal.reason as Error);
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    });

  return { fetchMock, calls };
};

describe('search race: a late answer to an old query', () => {
  let fake: ReturnType<typeof createFakeFetch>;
  let controller: SearchController;
  let history: ViewState[];

  beforeEach(() => {
    vi.useFakeTimers();
    fake = createFakeFetch();
    vi.stubGlobal('fetch', fake.fetchMock);
    controller = createSearchController({ search: searchCountries, debounceMs: DEBOUNCE_MS });
    history = [];
    controller.subscribe((state) => history.push(state));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const advance = async (ms: number): Promise<void> => {
    await vi.advanceTimersByTimeAsync(ms);
  };

  /** Types the text and waits until the request leaves. */
  const type = async (text: string): Promise<void> => {
    controller.input(text);
    await advance(DEBOUNCE_MS);
  };

  const callFor = (query: string): FetchCall => {
    const call = fake.calls.find((candidate) => candidate.query === query);
    if (!call) throw new Error(`no request for "${query}"`);
    return call;
  };

  const statuses = (): string[] => history.map((state) => state.status);

  /** No state of the history ever showed an answer to this query. */
  const neverShowed = (query: string): void => {
    const shown = history.filter((state) => state.status === 'results' && state.query === query);
    expect(shown).toEqual([]);
  };

  it('shows only the result of the last request when the earlier answer arrives later', async () => {
    await type('sp');
    await type('spain');
    expect(fake.calls.map((call) => call.query)).toEqual(['sp', 'spain']);

    // Inverted order: the newer answer first, the older one afterwards.
    callFor('spain').respond([spainRaw]);
    await advance(0);
    callFor('sp').respond([ukraineRaw]);
    await advance(0);

    expect(controller.getState()).toEqual({
      status: 'results',
      query: 'spain',
      cards: [spainCard],
    });
    neverShowed('sp');
  });

  it('really aborts the old request: its promise is rejected with AbortError', async () => {
    await type('sp');
    await type('spain');

    const old = callFor('sp');
    expect(old.signal.aborted).toBe(true);
    expect(old.abortReason).toMatchObject({ name: 'AbortError' });
    expect(callFor('spain').signal.aborted).toBe(false);
  });

  it('does not show the cancelled request as an error', async () => {
    await type('sp');
    await type('spain');
    callFor('spain').respond([spainRaw]);
    await advance(0);

    expect(statuses()).not.toContain('error');
  });

  it('aborts the old request as soon as the text changes, before debounce fires', async () => {
    await type('sp');

    controller.input('spain'); // no timers advanced

    expect(callFor('sp').signal.aborted).toBe(true);
    expect(fake.calls).toHaveLength(1);
  });

  it('does not show an old answer that arrives while the new text waits for debounce', async () => {
    await type('sp');
    controller.input('spain');

    callFor('sp').respond([ukraineRaw]); // the old answer shows up during the wait
    await advance(0);
    expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });

    await advance(DEBOUNCE_MS);
    callFor('spain').respond([spainRaw]);
    await advance(0);

    expect(controller.getState()).toMatchObject({ status: 'results', query: 'spain' });
    neverShowed('sp');
  });

  it('keeps only the last of three overlapping requests', async () => {
    await type('s');
    await type('sp');
    await type('spain');

    callFor('spain').respond([spainRaw]);
    await advance(0);
    callFor('sp').respond([ukraineRaw]);
    callFor('s').respond([ukraineRaw]);
    await advance(0);

    expect(controller.getState()).toEqual({
      status: 'results',
      query: 'spain',
      cards: [spainCard],
    });
    neverShowed('sp');
    neverShowed('s');
  });

  it('shows "nothing found" for the last query, not the old results', async () => {
    await type('sp');
    await type('zzzz');

    callFor('zzzz').respond('Country not found', 404);
    await advance(0);
    callFor('sp').respond([ukraineRaw]);
    await advance(0);

    expect(controller.getState()).toEqual({ status: 'empty', query: 'zzzz' });
    neverShowed('sp');
  });

  it('shows the last query even if the old request fails late', async () => {
    await type('sp');
    await type('spain');

    callFor('spain').respond([spainRaw]);
    await advance(0);
    callFor('sp').respond('Server error', 500);
    await advance(0);

    expect(controller.getState()).toMatchObject({ status: 'results', query: 'spain' });
    expect(statuses()).not.toContain('error');
  });

  it('cancels a retry that is still in flight when the user types something else', async () => {
    await type('spain');
    callFor('spain').respond('Server error', 500);
    await advance(0);
    expect(controller.getState()).toMatchObject({ status: 'error', query: 'spain' });

    controller.retry();
    const retried = fake.calls[1];
    await type('ukraine');

    expect(retried.signal.aborted).toBe(true);
    retried.respond([spainRaw]); // too late
    callFor('ukraine').respond([ukraineRaw]);
    await advance(0);

    expect(controller.getState()).toMatchObject({ status: 'results', query: 'ukraine' });
    neverShowed('spain');
  });

  it('shows nothing from an old request after the field is cleared', async () => {
    await type('spain');

    controller.input('');
    callFor('spain').respond([spainRaw]);
    await advance(DEBOUNCE_MS * 2);

    expect(controller.getState()).toEqual({ status: 'idle' });
    neverShowed('spain');
  });

  it('works the same without a race: answers in order give the last query', async () => {
    await type('sp');
    callFor('sp').respond([ukraineRaw]);
    await advance(0);
    expect(controller.getState()).toMatchObject({ status: 'results', query: 'sp' });

    await type('spain');
    callFor('spain').respond([spainRaw]);
    await advance(0);

    expect(controller.getState()).toMatchObject({ status: 'results', query: 'spain' });
  });
});
