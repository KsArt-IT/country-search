import { describe, expect, it } from 'vitest';
import { classifyError } from './classify-error';
import { HttpError } from './http-error';

/** The reason fetch rejects with after `controller.abort()`. */
const abortReason = (): unknown => {
  const controller = new AbortController();
  controller.abort();
  return controller.signal.reason;
};

/** The reason fetch rejects with after `AbortSignal.timeout()` fires (real timer, ~1 ms). */
const timeoutReason = (): Promise<unknown> => {
  const signal = AbortSignal.timeout(1);
  return new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve(signal.reason), { once: true });
  });
};

describe('classifyError', () => {
  describe('aborted', () => {
    it('recognizes the real reason of controller.abort()', () => {
      expect(classifyError(abortReason())).toBe('aborted');
    });

    it('recognizes a DOMException named AbortError', () => {
      expect(classifyError(new DOMException('Aborted', 'AbortError'))).toBe('aborted');
    });

    // Decision: classification is by `name`, not by `instanceof DOMException`,
    // so errors from other realms, polyfills or wrappers are recognized too.
    it('recognizes an Error with name AbortError (not a DOMException)', () => {
      expect(classifyError(Object.assign(new Error('x'), { name: 'AbortError' }))).toBe('aborted');
    });

    it('recognizes a plain object with name AbortError', () => {
      expect(classifyError({ name: 'AbortError' })).toBe('aborted');
    });

    it('does not rely on the message', () => {
      expect(classifyError(new Error('The operation was aborted'))).toBe('unknown');
    });
  });

  describe('timeout', () => {
    it('recognizes the real reason of AbortSignal.timeout()', async () => {
      expect(classifyError(await timeoutReason())).toBe('timeout');
    });

    it('recognizes a DOMException named TimeoutError', () => {
      expect(classifyError(new DOMException('Timed out', 'TimeoutError'))).toBe('timeout');
    });

    it('recognizes a plain object with name TimeoutError', () => {
      expect(classifyError({ name: 'TimeoutError' })).toBe('timeout');
    });

    it('does not confuse a timeout with an abort, and vice versa', () => {
      expect(classifyError({ name: 'TimeoutError' })).not.toBe('aborted');
      expect(classifyError({ name: 'AbortError' })).not.toBe('timeout');
    });
  });

  describe('http', () => {
    it.each([400, 429, 500, 503])('recognizes an HttpError with status %i', (status) => {
      expect(classifyError(new HttpError(status))).toBe('http');
    });

    it('does not classify an HttpError by its message', () => {
      expect(classifyError(new HttpError(500, 'Failed to fetch'))).toBe('http');
    });
  });

  describe('network', () => {
    // fetch rejects with a TypeError everywhere, but the text differs per browser.
    it.each([
      ['Chrome', 'Failed to fetch'],
      ['Firefox', 'NetworkError when attempting to fetch resource.'],
      ['Safari', 'Load failed'],
      ['any other text', 'something completely different'],
    ])('recognizes a TypeError by type, not by text (%s)', (_browser, message) => {
      expect(classifyError(new TypeError(message))).toBe('network');
    });

    it('does not treat a plain Error with a network-like text as a network error', () => {
      expect(classifyError(new Error('Failed to fetch'))).toBe('unknown');
    });
  });

  describe('unknown', () => {
    it('classifies our own "unexpected response" error as unknown', () => {
      const error = new Error('Unexpected response: expected an array of countries');

      expect(classifyError(error)).toBe('unknown');
    });

    it('classifies other Error types as unknown', () => {
      expect(classifyError(new RangeError('x'))).toBe('unknown');
      expect(classifyError(new SyntaxError('x'))).toBe('unknown');
    });

    it.each([
      ['a string', 'boom'],
      ['null', null],
      ['undefined', undefined],
      ['an empty object', {}],
      ['a number', 42],
      ['an array', []],
      ['a symbol', Symbol('x')],
      ['an object with a non-string name', { name: 42 }],
    ])('returns unknown and does not throw for %s', (_label, value) => {
      expect(() => classifyError(value)).not.toThrow();
      expect(classifyError(value)).toBe('unknown');
    });
  });

  describe('purity', () => {
    it('returns the same kind for the same input', () => {
      const error = new HttpError(500);

      expect(classifyError(error)).toBe(classifyError(error));
    });

    it('does not change the error it classifies', () => {
      const error = new HttpError(503, 'down');

      classifyError(error);

      expect(error.name).toBe('HttpError');
      expect(error.status).toBe(503);
      expect(error.message).toBe('down');
    });
  });
});
