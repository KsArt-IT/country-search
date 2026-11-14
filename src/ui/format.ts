/** Shown instead of a missing value: `null`, an empty string or an empty list. */
export const NO_DATA = '-';

const numberFormat = new Intl.NumberFormat('en-US');

/** 47351567 -> "47,351,567". `0` is a real value; only `null` means "no data". */
export const formatNumber = (value: number | null): string =>
  value === null ? NO_DATA : numberFormat.format(value);

export const formatText = (value: string | null): string => (value ? value : NO_DATA);

export const formatList = (items: readonly string[]): string =>
  items.length > 0 ? items.join(', ') : NO_DATA;
