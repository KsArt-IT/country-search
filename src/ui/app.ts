import type { SearchController } from '../core/search-controller';
import type { SearchHistory } from '../core/search-history';
import { element } from './dom';
import { renderHistory, renderState, type Actions } from './render';

/**
 * Builds the input, the row of recent queries and the result area ONCE and keeps
 * them. Only the content of the area (and of the history row) is replaced, so the
 * input never loses focus.
 */
export const mountApp = (
  root: HTMLElement,
  controller: SearchController,
  history: SearchHistory,
): void => {
  const input = element('input', {
    className: 'search-input',
    attrs: {
      type: 'search',
      placeholder: 'Search country…',
      autocomplete: 'off',
      'aria-label': 'Country name',
    },
  });
  input.addEventListener('input', () => controller.input(input.value));

  const historyBar = element('nav', {
    className: 'history',
    attrs: { 'aria-label': 'Recent searches' },
  });
  const area = element('main');

  root.replaceChildren(input, historyBar, area);

  const searchFromHistory = (query: string): void => {
    input.value = query;
    controller.searchNow(query);
  };

  // Redrawn only when the list changed, so a focused history button is not thrown away for nothing.
  let shownHistory = '';
  const showHistory = (): void => {
    const queries = history.get();
    const signature = JSON.stringify(queries);
    if (signature === shownHistory) return;

    shownHistory = signature;
    historyBar.replaceChildren(...renderHistory(queries, searchFromHistory));
    historyBar.hidden = queries.length === 0;
  };
  showHistory();

  const actions: Actions = {
    retry: () => controller.retry(),
    openDetails: (code) => controller.openDetails(code),
    closeDetails: () => controller.closeDetails(),
  };

  controller.subscribe((state) => {
    if (state.status === 'results') {
      history.add(state.query);
      showHistory();
    }

    area.replaceChildren(renderState(state, actions));
    // The clicked card is gone from the DOM: put the focus on "Back" so keyboard users keep their place.
    area.querySelector<HTMLElement>('.back-button')?.focus();
  });
};
