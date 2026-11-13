import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CountryResponse } from './country-response';
import { HttpError } from './http-error';
import { DEFAULT_TIMEOUT_MS, searchCountries } from './search-countries';

const country = (name: string, alpha3Code: string): CountryResponse => ({
  name,
  nativeName: name,
  alpha2Code: alpha3Code.slice(0, 2),
  alpha3Code,
  capital: 'Capital',
  region: 'Europe',
  subregion: 'Southern Europe',
  population: 1000,
  flag: '🏳️',
  flags: { png: 'f.png', svg: 'f.svg' },
  languages: [{ name: 'Spanish', nativeName: 'Español', iso639_1: 'es' }],
  timezones: ['UTC'],
});

const okResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as Response;

const errorResponse = (status: number): Response =>
  ({
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve({}),
  }) as Response;

/**
 * Behaves like the real fetch: never answers on its own and rejects with
 * `signal.reason` once the signal is aborted (AbortError for abort(),
 * TimeoutError for AbortSignal.timeout()).
 */
const hangingFetch = (_url: string, init: RequestInit): Promise<Response> =>
  new Promise((_resolve, reject) => {
    const signal = init.signal;
    if (!signal) {
      reject(new Error('fetch was called without a signal'));
      return;
    }
    const rejectWithReason = (): void => reject(signal.reason as Error);
    if (signal.aborted) {
      rejectWithReason();
      return;
    }
    signal.addEventListener('abort', rejectWithReason, { once: true });
  });

describe('searchCountries', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a promise', () => {
    fetchMock.mockResolvedValue(okResponse([]));

    const result = searchCountries('ger', new AbortController().signal);

    expect(result).toBeInstanceOf(Promise);
    return result;
  });

  it('calls fetch once', async () => {
    fetchMock.mockResolvedValue(okResponse([]));

    await searchCountries('ger', new AbortController().signal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('requests the countries.dev name endpoint', async () => {
    fetchMock.mockResolvedValue(okResponse([]));

    await searchCountries('germany', new AbortController().signal);

    // The URL is written out on purpose: the test is an independent witness
    // of the real address, not a copy of the production constant.
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://countries.dev/name/germany');
  });

  it('encodes special characters in the query', async () => {
    fetchMock.mockResolvedValue(okResponse([]));

    await searchCountries('a b/c?', new AbortController().signal);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain(encodeURIComponent('a b/c?'));
    expect(url).not.toContain('a b');
  });

  it('resolves with the array of countries from the response', async () => {
    const countries = [country('Germany', 'DEU'), country('Gambia', 'GMB')];
    fetchMock.mockResolvedValue(okResponse(countries));

    const result = await searchCountries('g', new AbortController().signal);

    expect(result).toEqual(countries);
  });

  it('passes an empty array from a 200 response through', async () => {
    fetchMock.mockResolvedValue(okResponse([]));

    const result = await searchCountries('zzz', new AbortController().signal);

    expect(result).toEqual([]);
  });

  it('resolves with an empty array on HTTP 404 (country not found)', async () => {
    fetchMock.mockResolvedValue(errorResponse(404));

    const result = await searchCountries('zzz', new AbortController().signal);

    expect(result).toEqual([]);
  });

  it('does not parse the body on 404 (API answers with plain text)', async () => {
    const json = vi.fn().mockRejectedValue(new SyntaxError('Unexpected token'));
    fetchMock.mockResolvedValue({ ...errorResponse(404), json });

    await expect(searchCountries('zzz', new AbortController().signal)).resolves.toEqual([]);
    expect(json).not.toHaveBeenCalled();
  });

  it.each([{ message: 'oops' }, null, 'Country not found', 42])(
    'rejects when a 200 response body is not an array (%j)',
    async (body) => {
      fetchMock.mockResolvedValue(okResponse(body));

      const error = await searchCountries('ger', new AbortController().signal).catch(
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(HttpError);
    },
  );

  it.each([400, 429, 500, 503])('rejects when the response is not ok (HTTP %i)', async (status) => {
    fetchMock.mockResolvedValue(errorResponse(status));

    await expect(searchCountries('ger', new AbortController().signal)).rejects.toThrow();
  });

  it('rejects with an HttpError that carries the response status', async () => {
    fetchMock.mockResolvedValue(errorResponse(500));

    const error = await searchCountries('ger', new AbortController().signal).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(500);
  });

  it.each([400, 429, 503])('keeps the status %i on the HttpError', async (status) => {
    fetchMock.mockResolvedValue(errorResponse(status));

    await expect(searchCountries('ger', new AbortController().signal)).rejects.toMatchObject({
      status,
    });
  });

  it('does not wrap network errors into HttpError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await searchCountries('ger', new AbortController().signal).catch(
      (e: unknown) => e,
    );

    expect(error).not.toBeInstanceOf(HttpError);
  });

  it('does not parse the body when the response is not ok', async () => {
    const json = vi.fn();
    fetchMock.mockResolvedValue({ ...errorResponse(500), json });

    await searchCountries('ger', new AbortController().signal).catch(() => {});

    expect(json).not.toHaveBeenCalled();
  });

  it('propagates network errors from fetch', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(searchCountries('ger', new AbortController().signal)).rejects.toThrow(
      'Failed to fetch',
    );
  });

  it('propagates AbortError when the request is aborted', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(hangingFetch);

    const promise = searchCountries('ger', controller.signal);
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  describe('timeout', () => {
    // Real timers on purpose: fake timers do not move AbortSignal.timeout.
    // The duration is injected (3rd argument), so the test takes milliseconds.
    const TIMEOUT_MS = 20;

    it('rejects with TimeoutError when the server does not answer in time', async () => {
      fetchMock.mockImplementation(hangingFetch);

      await expect(
        searchCountries('ger', new AbortController().signal, TIMEOUT_MS),
      ).rejects.toMatchObject({ name: 'TimeoutError' });
    });

    it('keeps AbortError for the caller abort even when a timeout is configured', async () => {
      const controller = new AbortController();
      fetchMock.mockImplementation(hangingFetch);

      const promise = searchCountries('ger', controller.signal, DEFAULT_TIMEOUT_MS);
      controller.abort();

      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('does not time out when the response arrives in time', async () => {
      const countries = [country('Spain', 'ESP')];
      fetchMock.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(okResponse(countries)), 5)),
      );

      await expect(searchCountries('spain', new AbortController().signal, 500)).resolves.toEqual(
        countries,
      );
    });
  });
});
