import { describe, expect, it } from 'vitest';
import { HttpError } from './http-error';

describe('HttpError', () => {
  it('is an instance of Error and HttpError', () => {
    const error = new HttpError(500);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HttpError);
  });

  it('stores the response status', () => {
    expect(new HttpError(503).status).toBe(503);
  });

  it('has the name "HttpError"', () => {
    expect(new HttpError(500).name).toBe('HttpError');
  });

  it('uses the given message', () => {
    expect(new HttpError(500, 'Server down').message).toBe('Server down');
  });

  it('includes the status in the default message', () => {
    expect(new HttpError(500).message).toContain('500');
  });
});
