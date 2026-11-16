import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a function', () => {
    expect(typeof debounce(vi.fn(), 100)).toBe('function');
  });

  it('does not call fn immediately', () => {
    const fn = vi.fn();
    debounce(fn, 100)();

    expect(fn).not.toHaveBeenCalled();
  });

  it('calls fn once after the delay', () => {
    const fn = vi.fn();
    debounce(fn, 100)();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not call fn before the delay elapses', () => {
    const fn = vi.fn();
    debounce(fn, 100)();

    vi.advanceTimersByTime(99);

    expect(fn).not.toHaveBeenCalled();
  });

  it('calls fn only once for rapid consecutive calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets the timer on every call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(60);
    debounced();
    vi.advanceTimersByTime(60);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(40);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes the arguments of the last call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a', 1);
    debounced('ab', 2);
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith('ab', 2);
  });

  it('can be triggered again after a previous invocation', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(100);
    debounced();
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('keeps independent timers for separate debounced functions', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    debounce(fn1, 100)();
    debounce(fn2, 200)();

    vi.advanceTimersByTime(100);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});
