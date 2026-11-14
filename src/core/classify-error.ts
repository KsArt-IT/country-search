export type ErrorKind = 'aborted' | 'timeout' | 'http' | 'network' | 'unknown';

export const classifyError = (_error: unknown): ErrorKind => {
  // TODO: implement (TDD stub)
  throw new Error('Not implemented');
};
