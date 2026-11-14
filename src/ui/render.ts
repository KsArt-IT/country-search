import type { CountryCard } from '../core/country-card';
import type { ViewState } from '../core/view-state';
import { createCard, createDetails } from './components';
import { element } from './dom';
import { ERROR_MESSAGES, type ErrorState } from './error-messages';

const renderIdle = (): HTMLElement =>
  element('p', {
    className: 'hint',
    text: 'Start typing a country name',
    attrs: { role: 'status' },
  });

const renderLoading = (): HTMLElement =>
  element('p', { className: 'loading', attrs: { role: 'status' } }, [
    element('span', { className: 'spinner', attrs: { 'aria-hidden': 'true' } }),
    element('span', { text: 'Loading…' }),
  ]);

const renderEmpty = (query: string): HTMLElement =>
  element('p', {
    className: 'empty',
    text: `Nothing found for “${query}”`,
    attrs: { role: 'status' },
  });

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

const renderCard = (card: CountryCard, actions: Actions): HTMLElement => {
  const button = createCard(card);
  button.addEventListener('click', () => actions.openDetails(card.code));

  return element('li', { className: 'cards-item' }, [button]);
};

const renderResults = (cards: readonly CountryCard[], actions: Actions): HTMLElement =>
  element(
    'ul',
    { className: 'cards' },
    cards.map((card) => renderCard(card, actions)),
  );

/** Shown INSTEAD of the list; "Back" returns to the same list without a new request. */
const renderDetails = (card: CountryCard, actions: Actions): HTMLElement => {
  const { root, backButton } = createDetails(card);
  backButton.addEventListener('click', () => actions.closeDetails());

  return root;
};

/** What the screen can ask the controller to do. */
export interface Actions {
  retry(): void;
  openDetails(code: string): void;
  closeDetails(): void;
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
    case 'results':
      return renderResults(state.cards, actions);
    case 'details':
      return renderDetails(state.selected, actions);
    default: {
      // A new ViewState status without a case above fails here, in tsc, not on the screen.
      const unreachable: never = state;
      return unreachable;
    }
  }
};
