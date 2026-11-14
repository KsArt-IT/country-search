import type { ViewState } from '../core/view-state';
import { element } from './dom';
import { ERROR_MESSAGES, type ErrorState } from './error-messages';

const renderIdle = (): HTMLElement =>
  element('p', { className: 'hint', text: 'Start typing a country name' });

const renderLoading = (): HTMLElement =>
  element('p', { className: 'loading' }, [
    element('span', { className: 'spinner', attrs: { 'aria-hidden': 'true' } }),
    element('span', { text: 'Loading…' }),
  ]);

const renderEmpty = (query: string): HTMLElement =>
  element('p', { className: 'empty', text: `Nothing found for “${query}”` });

const renderError = ({ kind }: ErrorState, actions: Actions): HTMLElement => {
  const retryButton = element('button', {
    className: 'retry-button',
    text: 'Retry',
    attrs: { type: 'button' },
  });
  retryButton.addEventListener('click', () => actions.retry());

  return element('div', { className: 'error', attrs: { role: 'alert' } }, [
    element('p', { text: ERROR_MESSAGES[kind] }),
    retryButton,
  ]);
};

/** Placeholder for the states that are not drawn yet: shows only the status. */
const renderPending = (state: ViewState): HTMLElement => element('p', { text: state.status });

/** What the screen can ask the controller to do. */
export interface Actions {
  retry(): void;
}

export const renderState = (state: ViewState, actions: Actions): HTMLElement => {
  switch (state.status) {
    case 'idle':
      return renderIdle();
    case 'loading':
      return renderLoading();
    case 'empty':
      return renderEmpty(state.query);
    case 'error':
      return renderError(state, actions);
    default:
      return renderPending(state);
  }
};
