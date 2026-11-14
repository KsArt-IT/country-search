import type { ViewState } from '../core/view-state';
import { element } from './dom';

const renderIdle = (): HTMLElement =>
  element('p', { className: 'hint', text: 'Start typing a country name' });

const renderLoading = (): HTMLElement =>
  element('p', { className: 'loading' }, [
    element('span', { className: 'spinner', attrs: { 'aria-hidden': 'true' } }),
    element('span', { text: 'Loading…' }),
  ]);

const renderEmpty = (query: string): HTMLElement =>
  element('p', { className: 'empty', text: `Nothing found for “${query}”` });

/** Placeholder for the states that are not drawn yet: shows only the status. */
const renderPending = (state: ViewState): HTMLElement => element('p', { text: state.status });

export const renderState = (state: ViewState): HTMLElement => {
  switch (state.status) {
    case 'idle':
      return renderIdle();
    case 'loading':
      return renderLoading();
    case 'empty':
      return renderEmpty(state.query);
    default:
      return renderPending(state);
  }
};
