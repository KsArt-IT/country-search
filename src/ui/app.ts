import type { SearchController } from '../core/search-controller';
import { element } from './dom';
import { renderState, type Actions } from './render';

/**
 * Builds the input and the result area ONCE and keeps them. Only the content of
 * the area is replaced on a state change, so the input never loses focus.
 */
export const mountApp = (root: HTMLElement, controller: SearchController): void => {
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

  const area = element('main');

  root.replaceChildren(input, area);

  const actions: Actions = {
    retry: () => controller.retry(),
    openDetails: (code) => controller.openDetails(code),
    closeDetails: () => controller.closeDetails(),
  };

  controller.subscribe((state) => {
    area.replaceChildren(renderState(state, actions));
    // The clicked card is gone from the DOM: put the focus on "Back" so keyboard users keep their place.
    area.querySelector<HTMLElement>('.back-button')?.focus();
  });
};
