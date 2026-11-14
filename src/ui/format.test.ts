import { describe, expect, it } from 'vitest';
import { formatList, formatNumber, formatText, NO_DATA } from './format';

describe('formatNumber', () => {
  it.each([
    [47351567, '47,351,567'],
    [1000, '1,000'],
    [999, '999'],
    [93.58, '93.58'],
  ])('groups thousands with commas: %d -> %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });

  it('keeps 0 as a real value, not as "no data"', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('shows a dash for null', () => {
    expect(formatNumber(null)).toBe(NO_DATA);
  });
});

describe('formatText', () => {
  it('returns the text as it is', () => {
    expect(formatText('Madrid')).toBe('Madrid');
  });

  it.each([null, ''])('shows a dash for %j', (value) => {
    expect(formatText(value)).toBe(NO_DATA);
  });
});

describe('formatList', () => {
  it('joins the items with a comma and a space', () => {
    expect(formatList(['English', 'Russian'])).toBe('English, Russian');
  });

  it('does not add separators to a single item', () => {
    expect(formatList(['Spanish'])).toBe('Spanish');
  });

  it('shows a dash for an empty list', () => {
    expect(formatList([])).toBe(NO_DATA);
  });
});
