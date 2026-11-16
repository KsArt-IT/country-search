import { beforeEach, describe, expect, it } from 'vitest';
import { createCachedSearch } from './cached-search';
import type { CountryResponse } from './country-response';
import spainJson from './fixtures/spain.json';
import ukraineJson from './fixtures/ukraine.json';
import { HttpError } from './http-error';
import type { SearchFn } from './search-controller';

const spainRaw = (spainJson as CountryResponse[])[0];
const ukraineRaw = (ukraineJson as CountryResponse[])[0];

// --- fake search ---

interface PendingCall {
  query: string;
  signal: AbortSignal;
  resolve: (countries: CountryResponse[]) => void;
  reject: (reason: unknown) => void;
}

/**
 * A search whose promises are settled by the test. With `autoReject` (default) it
 * behaves like the real fetch: an aborted signal rejects the promise with its reason.
 * Without it the test decides when (and if) the aborted request fails.
 */
const createFakeSearch = (autoReject = true): { search: SearchFn; calls: PendingCall[] } => {
  const calls: PendingCall[] = [];
  const search: SearchFn = (query, signal) =>
    new Promise<CountryResponse[]>((resolve, reject) => {
      calls.push({ query, signal, resolve, reject });
      if (!autoReject) return;
      if (signal.aborted) {
        reject(signal.reason as Error);
        return;
      }
      signal.addEventListener('abort', () => reject(signal.reason as Error), { once: true });
    });
  return { search, calls };
};

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const abortError = (): DOMException => new DOMException('Aborted', 'AbortError');

describe('createCachedSearch', () => {
  let fake: ReturnType<typeof createFakeSearch>;
  let cached: SearchFn;

  beforeEach(() => {
    fake = createFakeSearch();
    cached = createCachedSearch(fake.search);
  });

  // --- the cache ---

  describe('cache', () => {
    it('resolves the first call with the result of search', async () => {
      const promise = cached('spain', new AbortController().signal);

      fake.calls[0].resolve([spainRaw]);

      await expect(promise).resolves.toEqual([spainRaw]);
    });

    it('answers a repeated query from the cache without a second request', async () => {
      const first = cached('spain', new AbortController().signal);
      fake.calls[0].resolve([spainRaw]);
      await first;

      const second = await cached('spain', new AbortController().signal);

      expect(second).toEqual([spainRaw]);
      expect(fake.calls).toHaveLength(1);
    });

    it('does not mix up different queries', async () => {
      const spain = cached('spain', new AbortController().signal);
      const ukraine = cached('ukraine', new AbortController().signal);

      fake.calls[0].resolve([spainRaw]);
      fake.calls[1].resolve([ukraineRaw]);

      expect(fake.calls.map((call) => call.query)).toEqual(['spain', 'ukraine']);
      await expect(spain).resolves.toEqual([spainRaw]);
      await expect(ukraine).resolves.toEqual([ukraineRaw]);
    });

    it('ignores the case of the query', async () => {
      const first = cached('Spain', new AbortController().signal);
      fake.calls[0].resolve([spainRaw]);
      await first;

      await expect(cached('SPAIN', new AbortController().signal)).resolves.toEqual([spainRaw]);
      await expect(cached('spain', new AbortController().signal)).resolves.toEqual([spainRaw]);
      expect(fake.calls).toHaveLength(1);
    });

    it('caches an empty result too ("nothing found" is a valid answer)', async () => {
      const first = cached('zzzz', new AbortController().signal);
      fake.calls[0].resolve([]);
      await first;

      await expect(cached('zzzz', new AbortController().signal)).resolves.toEqual([]);
      expect(fake.calls).toHaveLength(1);
    });

    it('keeps a separate cache for every wrapper', async () => {
      const otherFake = createFakeSearch();
      const other = createCachedSearch(otherFake.search);
      const first = cached('spain', new AbortController().signal);
      fake.calls[0].resolve([spainRaw]);
      await first;

      const second = other('spain', new AbortController().signal);
      otherFake.calls[0].resolve([spainRaw]);
      await second;

      expect(otherFake.calls).toHaveLength(1);
    });

    it('is not affected when a caller aborts after the result has arrived', async () => {
      const controller = new AbortController();
      const first = cached('spain', controller.signal);
      fake.calls[0].resolve([spainRaw]);
      await first;

      controller.abort();

      await expect(cached('spain', new AbortController().signal)).resolves.toEqual([spainRaw]);
      expect(fake.calls).toHaveLength(1);
    });
  });

  // --- requests in flight ---

  describe('requests in flight', () => {
    it('makes one request for two simultaneous identical queries', async () => {
      const first = cached('spain', new AbortController().signal);
      const second = cached('spain', new AbortController().signal);

      fake.calls[0].resolve([spainRaw]);

      expect(fake.calls).toHaveLength(1);
      await expect(first).resolves.toEqual([spainRaw]);
      await expect(second).resolves.toEqual([spainRaw]);
    });

    it('joins a request that is already in flight when a later caller arrives', async () => {
      const first = cached('spain', new AbortController().signal);
      await flush();

      const second = cached('spain', new AbortController().signal);
      fake.calls[0].resolve([spainRaw]);

      expect(fake.calls).toHaveLength(1);
      await expect(first).resolves.toEqual([spainRaw]);
      await expect(second).resolves.toEqual([spainRaw]);
    });

    it('joins in-flight requests regardless of the case', async () => {
      const first = cached('Spain', new AbortController().signal);
      const second = cached('sPAIN', new AbortController().signal);

      fake.calls[0].resolve([spainRaw]);

      expect(fake.calls).toHaveLength(1);
      await Promise.all([first, second]);
    });

    it('does not join a request for another query', async () => {
      const spain = cached('spain', new AbortController().signal);
      const ukraine = cached('ukraine', new AbortController().signal);

      expect(fake.calls).toHaveLength(2);
      fake.calls[0].resolve([spainRaw]);
      fake.calls[1].resolve([ukraineRaw]);
      await Promise.all([spain, ukraine]);
    });
  });

  // --- every caller has its own cancellation ---

  describe('cancelling one of several callers', () => {
    it('rejects only the cancelled caller, with AbortError', async () => {
      const a = new AbortController();
      const cancelled = cached('spain', a.signal);
      const waiting = cached('spain', new AbortController().signal);

      a.abort();

      await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
      fake.calls[0].resolve([spainRaw]);
      await expect(waiting).resolves.toEqual([spainRaw]);
    });

    it('rejects the cancelled caller right away, without waiting for the server', async () => {
      const a = new AbortController();
      const cancelled = cached('spain', a.signal);
      const waiting = cached('spain', new AbortController().signal);

      a.abort();

      await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
      expect(fake.calls[0].signal.aborted).toBe(false);
      fake.calls[0].resolve([spainRaw]);
      await waiting;
    });

    it('does not abort the real request while at least one caller is still waiting', async () => {
      const a = new AbortController();
      const cancelled = cached('spain', a.signal);
      const waiting = cached('spain', new AbortController().signal);

      a.abort();
      // Attach the handler right away: the promise is already rejected, and a
      // rejection nobody listens to during `flush()` is reported as unhandled.
      const cancelledRejection = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
      await flush();

      expect(fake.calls[0].signal.aborted).toBe(false);
      fake.calls[0].resolve([spainRaw]);
      await expect(waiting).resolves.toEqual([spainRaw]);
      await cancelledRejection;
    });

    it('lets a caller who joined later still get the result after the first one cancelled', async () => {
      const a = new AbortController();
      const first = cached('spain', a.signal);
      await flush();
      const late = cached('spain', new AbortController().signal);

      a.abort();
      fake.calls[0].resolve([spainRaw]);

      await expect(first).rejects.toMatchObject({ name: 'AbortError' });
      await expect(late).resolves.toEqual([spainRaw]);
      expect(fake.calls).toHaveLength(1);
    });
  });

  describe('cancelling every caller', () => {
    it('aborts the real request when its only caller cancels', async () => {
      const a = new AbortController();
      const promise = cached('spain', a.signal);

      a.abort();

      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
      expect(fake.calls[0].signal.aborted).toBe(true);
    });

    it('aborts the real request only after the LAST caller cancels', async () => {
      const a = new AbortController();
      const b = new AbortController();
      const first = cached('spain', a.signal);
      const second = cached('spain', b.signal);

      a.abort();
      await expect(first).rejects.toMatchObject({ name: 'AbortError' });
      expect(fake.calls[0].signal.aborted).toBe(false);

      b.abort();
      await expect(second).rejects.toMatchObject({ name: 'AbortError' });
      expect(fake.calls[0].signal.aborted).toBe(true);
    });

    it('starts a new request for the next caller after a full cancel', async () => {
      const a = new AbortController();
      const cancelled = cached('spain', a.signal);
      a.abort();
      await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });

      const next = cached('spain', new AbortController().signal);

      expect(fake.calls).toHaveLength(2);
      expect(fake.calls[1].signal.aborted).toBe(false);
      fake.calls[1].resolve([spainRaw]);
      await expect(next).resolves.toEqual([spainRaw]);
    });

    it('does not hand out the cancelled request to a caller who arrives right after', async () => {
      const a = new AbortController();
      const cancelled = cached('spain', a.signal);
      a.abort(); // no await: the next call comes in the same tick

      const next = cached('spain', new AbortController().signal);

      expect(fake.calls).toHaveLength(2);
      fake.calls[1].resolve([spainRaw]);
      await expect(next).resolves.toEqual([spainRaw]);
      await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('does not let the late failure of a cancelled request break a newer one', async () => {
      // The fake does not reject on abort by itself: the failure of the old
      // request arrives only when the test says so, after a new request started.
      const slowFake = createFakeSearch(false);
      const slow = createCachedSearch(slowFake.search);
      const a = new AbortController();
      const cancelled = slow('spain', a.signal);
      a.abort();
      await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });

      const newer = slow('spain', new AbortController().signal);
      slowFake.calls[0].reject(abortError()); // the old request fails late
      await flush();
      const joiner = slow('spain', new AbortController().signal);

      expect(slowFake.calls).toHaveLength(2); // the joiner shares the newer request
      slowFake.calls[1].resolve([spainRaw]);
      await expect(newer).resolves.toEqual([spainRaw]);
      await expect(joiner).resolves.toEqual([spainRaw]);
    });
  });

  // --- errors are not cached ---

  describe('errors', () => {
    it.each([
      ['an HttpError', new HttpError(500)],
      ['a network error', new TypeError('Failed to fetch')],
      ['a timeout', new DOMException('Timed out', 'TimeoutError')],
    ])('does not cache %s: the next call goes to the network', async (_label, failure) => {
      const first = cached('spain', new AbortController().signal);
      fake.calls[0].reject(failure);
      await expect(first).rejects.toBe(failure);

      const second = cached('spain', new AbortController().signal);

      expect(fake.calls).toHaveLength(2);
      fake.calls[1].resolve([spainRaw]);
      await expect(second).resolves.toEqual([spainRaw]);
    });

    it('gives the same error to every caller waiting for the failed request', async () => {
      const failure = new HttpError(503);
      const first = cached('spain', new AbortController().signal);
      const second = cached('spain', new AbortController().signal);

      fake.calls[0].reject(failure);

      await expect(first).rejects.toBe(failure);
      await expect(second).rejects.toBe(failure);
    });

    it('does not keep a failed request as "in flight"', async () => {
      const first = cached('spain', new AbortController().signal);
      fake.calls[0].reject(new HttpError(500));
      await expect(first).rejects.toBeInstanceOf(HttpError);

      const second = cached('spain', new AbortController().signal);
      const third = cached('spain', new AbortController().signal);

      expect(fake.calls).toHaveLength(2);
      fake.calls[1].resolve([spainRaw]);
      await Promise.all([second, third]);
    });
  });

  // --- a signal that is already aborted ---

  describe('an already aborted signal', () => {
    it('rejects at once and does not call search', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(cached('spain', controller.signal)).rejects.toMatchObject({
        name: 'AbortError',
      });
      expect(fake.calls).toHaveLength(0);
    });

    it('rejects with the reason of the signal', async () => {
      const reason = new Error('stop');
      const controller = new AbortController();
      controller.abort(reason);

      await expect(cached('spain', controller.signal)).rejects.toBe(reason);
    });

    it('rejects even when the answer is already in the cache', async () => {
      const first = cached('spain', new AbortController().signal);
      fake.calls[0].resolve([spainRaw]);
      await first;
      const controller = new AbortController();
      controller.abort();

      await expect(cached('spain', controller.signal)).rejects.toMatchObject({
        name: 'AbortError',
      });
    });

    it('does not start (or hold) a request for the next caller', async () => {
      const controller = new AbortController();
      controller.abort();
      await cached('spain', controller.signal).catch(() => undefined);

      const next = cached('spain', new AbortController().signal);

      expect(fake.calls).toHaveLength(1);
      expect(fake.calls[0].signal.aborted).toBe(false);
      fake.calls[0].resolve([spainRaw]);
      await expect(next).resolves.toEqual([spainRaw]);
    });
  });
});
