import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CountryResponse } from './country-response';
import spainJson from './fixtures/spain.json';
import ukraineJson from './fixtures/ukraine.json';
import { HttpError } from './http-error';
import { mapCountryResponse } from './map-country-response';
import { createSearchController, type SearchController, type SearchFn } from './search-controller';
import type { ViewState } from './view-state';

const DEBOUNCE_MS = 300;

const spainRaw = (spainJson as CountryResponse[])[0];
const ukraineRaw = (ukraineJson as CountryResponse[])[0];
const spainCard = mapCountryResponse(spainRaw);
const ukraineCard = mapCountryResponse(ukraineRaw);

// --- fake search ---

interface PendingCall {
  query: string;
  signal: AbortSignal;
  resolve: (countries: CountryResponse[]) => void;
  reject: (reason: unknown) => void;
}

/**
 * A search whose promises are settled by the test. Like the real fetch, it
 * rejects with `signal.reason` when the signal is aborted.
 */
const createFakeSearch = (): { search: SearchFn; calls: PendingCall[] } => {
  const calls: PendingCall[] = [];
  const search: SearchFn = (query, signal) =>
    new Promise<CountryResponse[]>((resolve, reject) => {
      calls.push({ query, signal, resolve, reject });
      // An already aborted signal fires no event: reject at once, like the real fetch.
      if (signal.aborted) {
        reject(signal.reason as Error);
        return;
      }
      signal.addEventListener('abort', () => reject(signal.reason as Error), { once: true });
    });
  return { search, calls };
};

describe('createSearchController', () => {
  let fake: ReturnType<typeof createFakeSearch>;
  let controller: SearchController;

  beforeEach(() => {
    vi.useFakeTimers();
    fake = createFakeSearch();
    controller = createSearchController({ search: fake.search, debounceMs: DEBOUNCE_MS });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- helpers ---

  const advance = async (ms: number): Promise<void> => {
    await vi.advanceTimersByTimeAsync(ms);
  };
  const settle = (): Promise<void> => advance(0);

  const lastCall = (): PendingCall => {
    const call = fake.calls.at(-1);
    if (!call) throw new Error('search was not called');
    return call;
  };

  /** Types the text and waits until debounce lets the request out. */
  const type = async (text: string): Promise<void> => {
    controller.input(text);
    await advance(DEBOUNCE_MS);
  };

  const toResults = async (
    query = 'spain',
    countries: CountryResponse[] = [spainRaw],
  ): Promise<void> => {
    await type(query);
    lastCall().resolve(countries);
    await settle();
  };

  const toEmpty = async (query = 'zzz'): Promise<void> => {
    await type(query);
    lastCall().resolve([]);
    await settle();
  };

  const toError = async (query = 'spain'): Promise<void> => {
    await type(query);
    lastCall().reject(new HttpError(500));
    await settle();
  };

  /** Records every state the controller reports, starting with the current one. */
  const track = (): ViewState[] => {
    const states: ViewState[] = [];
    controller.subscribe((state) => states.push(state));
    return states;
  };

  const statuses = (states: ViewState[]): string[] => states.map((state) => state.status);

  /** The action changes nothing: same state, no notification, no new request. */
  const expectNoOp = async (action: () => void): Promise<void> => {
    const before = controller.getState();
    const states = track();
    const callsBefore = fake.calls.length;

    action();
    await advance(DEBOUNCE_MS * 2);

    expect(controller.getState()).toBe(before);
    expect(states).toHaveLength(1); // only the immediate call from subscribe
    expect(fake.calls).toHaveLength(callsBefore);
  };

  // --- initial state and subscribe ---

  describe('initial state', () => {
    it('starts in idle', () => {
      expect(controller.getState()).toEqual({ status: 'idle' });
    });

    it('does not search on creation', async () => {
      await advance(DEBOUNCE_MS * 2);

      expect(fake.calls).toHaveLength(0);
    });
  });

  describe('subscribe', () => {
    it('calls the listener immediately with the current state', () => {
      const listener = vi.fn();

      controller.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ status: 'idle' });
    });

    it('gives a late subscriber the current state, not the first one', () => {
      controller.input('spain');
      const listener = vi.fn();

      controller.subscribe(listener);

      expect(listener).toHaveBeenCalledWith({ status: 'loading', query: 'spain' });
    });

    it('notifies about every state change', async () => {
      const states = track();

      await toResults();

      expect(statuses(states)).toEqual(['idle', 'loading', 'results']);
    });

    it('notifies every subscriber', () => {
      const first = vi.fn();
      const second = vi.fn();
      controller.subscribe(first);
      controller.subscribe(second);

      controller.input('spain');

      expect(first).toHaveBeenLastCalledWith({ status: 'loading', query: 'spain' });
      expect(second).toHaveBeenLastCalledWith({ status: 'loading', query: 'spain' });
    });

    it('stops notifying after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = controller.subscribe(listener);
      listener.mockClear();

      unsubscribe();
      controller.input('spain');

      expect(listener).not.toHaveBeenCalled();
    });

    it('does not affect other subscribers when one unsubscribes', () => {
      const staying = vi.fn();
      const unsubscribe = controller.subscribe(vi.fn());
      controller.subscribe(staying);

      unsubscribe();
      controller.input('spain');

      expect(staying).toHaveBeenLastCalledWith({ status: 'loading', query: 'spain' });
    });
  });

  // --- decision 1: loading appears right away ---

  describe('loading', () => {
    it('appears immediately on input, while debounce is still waiting', () => {
      controller.input('spain');

      expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });
      expect(fake.calls).toHaveLength(0);
    });

    it('does not send the request before the debounce delay', async () => {
      controller.input('spain');

      await advance(DEBOUNCE_MS - 1);

      expect(fake.calls).toHaveLength(0);
    });

    it('sends the request once the debounce delay has passed', async () => {
      controller.input('spain');

      await advance(DEBOUNCE_MS);

      expect(fake.calls).toHaveLength(1);
      expect(lastCall().query).toBe('spain');
      expect(lastCall().signal).toBeInstanceOf(AbortSignal);
    });

    it('stays loading until the response arrives', async () => {
      await type('spain');

      expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });
    });

    it('replaces old results with loading right away on a new input', async () => {
      await toResults('spain');

      controller.input('spain2');

      expect(controller.getState()).toEqual({ status: 'loading', query: 'spain2' });
    });

    it('keeps the latest query in the loading state', () => {
      controller.input('sp');
      controller.input('spain');

      expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });
    });

    it('sends one request for rapid typing', async () => {
      for (const text of ['s', 'sp', 'spa', 'spai', 'spain']) {
        controller.input(text);
        await advance(50);
      }
      await advance(DEBOUNCE_MS);

      expect(fake.calls).toHaveLength(1);
      expect(lastCall().query).toBe('spain');
    });
  });

  // --- outcomes of a request ---

  describe('results', () => {
    it('shows mapped cards for the query', async () => {
      await toResults('spain', [spainRaw]);

      expect(controller.getState()).toEqual({
        status: 'results',
        query: 'spain',
        cards: [spainCard],
      });
    });

    it('keeps the order of the response', async () => {
      await toResults('s', [spainRaw, ukraineRaw]);

      expect(controller.getState()).toEqual({
        status: 'results',
        query: 's',
        cards: [spainCard, ukraineCard],
      });
    });
  });

  describe('empty', () => {
    it('shows "empty" when the search found nothing', async () => {
      await toEmpty('zzz');

      expect(controller.getState()).toEqual({ status: 'empty', query: 'zzz' });
    });

    it('is not an error', async () => {
      const states = track();

      await toEmpty();

      expect(statuses(states)).not.toContain('error');
    });
  });

  describe('error', () => {
    it.each([
      ['http', new HttpError(500)],
      ['network', new TypeError('Failed to fetch')],
      ['timeout', new DOMException('Timed out', 'TimeoutError')],
      ['unknown', new Error('Unexpected response: expected an array of countries')],
    ])('shows an error of kind "%s" and keeps the query', async (kind, failure) => {
      await type('spain');

      lastCall().reject(failure);
      await settle();

      expect(controller.getState()).toEqual({ status: 'error', query: 'spain', kind });
    });

    it('never shows an AbortError as an error', async () => {
      const states = track();
      await type('spain');

      lastCall().reject(new DOMException('Aborted', 'AbortError'));
      await settle();

      expect(statuses(states)).not.toContain('error');
    });
  });

  // --- cancelling on every input ---

  describe('cancelling the previous request', () => {
    it('aborts the request in flight right away on a new input', async () => {
      await type('sp');
      const first = lastCall();

      controller.input('spa'); // no timers advanced: debounce has not fired yet

      expect(first.signal.aborted).toBe(true);
    });

    it('gives every request its own signal', async () => {
      await type('sp');
      const first = lastCall();

      await type('spain');
      const second = lastCall();

      expect(second.signal).not.toBe(first.signal);
      expect(second.signal.aborted).toBe(false);
    });

    it('does not show the cancelled request as an error', async () => {
      const states = track();
      await type('sp');

      await type('spain');

      expect(statuses(states)).not.toContain('error');
    });

    it('aborts the request in flight when the field is cleared', async () => {
      await type('spain');
      const call = lastCall();

      controller.input('');

      expect(call.signal.aborted).toBe(true);
    });
  });

  // --- decision 2: trim ---

  describe('whitespace', () => {
    it('trims the query before storing and searching', async () => {
      controller.input('  spain ');
      expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });

      await advance(DEBOUNCE_MS);

      expect(lastCall().query).toBe('spain');
    });

    it('treats whitespace-only input as an empty input', async () => {
      controller.input('   ');

      expect(controller.getState()).toEqual({ status: 'idle' });
      await advance(DEBOUNCE_MS * 2);
      expect(fake.calls).toHaveLength(0);
    });

    it('does not send a second request when only the whitespace changes', async () => {
      controller.input('spain');
      controller.input(' spain ');

      await advance(DEBOUNCE_MS);

      expect(fake.calls).toHaveLength(1);
    });
  });

  // --- empty input and "typed and erased" ---

  describe('empty input', () => {
    it('clears the results and goes idle', async () => {
      await toResults();

      controller.input('');

      expect(controller.getState()).toEqual({ status: 'idle' });
    });

    it('goes idle from an error as well', async () => {
      await toError();

      controller.input('');

      expect(controller.getState()).toEqual({ status: 'idle' });
    });
  });

  describe('typed and erased before debounce fires', () => {
    it('does not send a request for the erased text', async () => {
      controller.input('spain');
      controller.input('');

      await advance(DEBOUNCE_MS * 2);

      expect(fake.calls).toHaveLength(0);
    });

    it('stays idle and never shows loading again', async () => {
      const states = track();
      controller.input('spain');
      controller.input('');

      await advance(DEBOUNCE_MS * 2);

      expect(controller.getState()).toEqual({ status: 'idle' });
      expect(statuses(states)).toEqual(['idle', 'loading', 'idle']);
    });

    it('works the same for whitespace-only input', async () => {
      controller.input('spain');
      controller.input('   ');

      await advance(DEBOUNCE_MS * 2);

      expect(fake.calls).toHaveLength(0);
      expect(controller.getState()).toEqual({ status: 'idle' });
    });

    it('sends exactly one request when the same text is typed again', async () => {
      controller.input('spain');
      controller.input('');
      controller.input('spain');

      await advance(DEBOUNCE_MS);

      expect(fake.calls).toHaveLength(1);
      expect(lastCall().query).toBe('spain');
    });

    it('stays idle when the field is cleared while the request is in flight', async () => {
      const states = track();
      await type('spain');

      controller.input('');
      await advance(DEBOUNCE_MS * 2);

      expect(controller.getState()).toEqual({ status: 'idle' });
      expect(statuses(states)).not.toContain('error');
      expect(fake.calls).toHaveLength(1);
    });
  });

  // --- retry ---

  describe('retry', () => {
    it('repeats the query stored in the error state', async () => {
      await toError('spain');

      controller.retry();

      expect(fake.calls).toHaveLength(2);
      expect(lastCall().query).toBe('spain');
    });

    it('goes to loading right away, without waiting for debounce', async () => {
      await toError('spain');

      controller.retry();

      expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });
    });

    it('repeats the LAST query, not an earlier failed one', async () => {
      await toError('sp');
      await toError('spain');

      controller.retry();

      expect(lastCall().query).toBe('spain');
    });

    it('uses a fresh, not aborted signal', async () => {
      await toError();
      const failed = lastCall();

      controller.retry();

      expect(lastCall().signal).not.toBe(failed.signal);
      expect(lastCall().signal.aborted).toBe(false);
    });

    it('shows the results when the retry succeeds', async () => {
      await toError('spain');

      controller.retry();
      lastCall().resolve([spainRaw]);
      await settle();

      expect(controller.getState()).toEqual({
        status: 'results',
        query: 'spain',
        cards: [spainCard],
      });
    });

    it('shows the error again when the retry fails too', async () => {
      await toError('spain');

      controller.retry();
      lastCall().reject(new TypeError('Failed to fetch'));
      await settle();

      expect(controller.getState()).toEqual({ status: 'error', query: 'spain', kind: 'network' });
    });
  });

  // --- decision 3: calls out of place do nothing ---

  describe('calls out of place', () => {
    it('retry() does nothing in idle', async () => {
      await expectNoOp(() => controller.retry());
    });

    it('retry() does nothing while loading', async () => {
      await type('spain');

      await expectNoOp(() => controller.retry());
    });

    it('retry() does nothing in results', async () => {
      await toResults();

      await expectNoOp(() => controller.retry());
    });

    it('retry() does nothing in empty', async () => {
      await toEmpty();

      await expectNoOp(() => controller.retry());
    });

    it('openDetails() with an unknown code does nothing', async () => {
      await toResults();

      await expectNoOp(() => controller.openDetails('XXX'));
    });

    it.each([
      ['idle', (): void => {}],
      ['loading', (): Promise<void> => type('spain')],
      ['empty', (): Promise<void> => toEmpty()],
      ['error', (): Promise<void> => toError()],
    ])('openDetails() does nothing in %s', async (_status, reach) => {
      await Promise.resolve(reach());

      await expectNoOp(() => controller.openDetails('ESP'));
    });

    it.each([
      ['idle', (): void => {}],
      ['loading', (): Promise<void> => type('spain')],
      ['results', (): Promise<void> => toResults()],
      ['empty', (): Promise<void> => toEmpty()],
      ['error', (): Promise<void> => toError()],
    ])('closeDetails() does nothing in %s', async (_status, reach) => {
      await Promise.resolve(reach());

      await expectNoOp(() => controller.closeDetails());
    });
  });

  // --- details ---

  describe('details', () => {
    it('opens the card with the given code and keeps the list', async () => {
      await toResults('s', [spainRaw, ukraineRaw]);

      controller.openDetails('UKR');

      expect(controller.getState()).toEqual({
        status: 'details',
        query: 's',
        cards: [spainCard, ukraineCard],
        selected: ukraineCard,
      });
    });

    it('goes back to the same results without a new request', async () => {
      await toResults('s', [spainRaw, ukraineRaw]);
      controller.openDetails('ESP');
      const callsBefore = fake.calls.length;

      controller.closeDetails();
      await advance(DEBOUNCE_MS * 2);

      expect(controller.getState()).toEqual({
        status: 'results',
        query: 's',
        cards: [spainCard, ukraineCard],
      });
      expect(fake.calls).toHaveLength(callsBefore);
    });

    it('a new input closes the details and starts loading', async () => {
      await toResults();
      controller.openDetails('ESP');

      controller.input('ukraine');

      expect(controller.getState()).toEqual({ status: 'loading', query: 'ukraine' });
    });

    it('clearing the field in details goes idle', async () => {
      await toResults();
      controller.openDetails('ESP');

      controller.input('');

      expect(controller.getState()).toEqual({ status: 'idle' });
    });

    it('retry() does nothing in details', async () => {
      await toResults();
      controller.openDetails('ESP');

      await expectNoOp(() => controller.retry());
    });
  });
});
