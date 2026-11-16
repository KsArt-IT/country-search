import type { ErrorKind } from './classify-error';
import type { CountryCard } from './country-card';

/**
 * Everything the screen needs to render. Each state carries its own data, so
 * nothing (like the query for "Retry") hides in the controller.
 */
export type ViewState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'results'; query: string; cards: CountryCard[] }
  | { status: 'empty'; query: string }
  | { status: 'error'; query: string; kind: Exclude<ErrorKind, 'aborted'> }
  | { status: 'details'; query: string; cards: CountryCard[]; selected: CountryCard };
