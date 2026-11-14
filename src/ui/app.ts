import type { SearchController } from '../core/search-controller';
import { element } from './dom';
import { renderState } from './render';

/**
 * Builds the input and the result area ONCE and keeps them. Only the content of
 * the area is replaced on a state change, so the input never loses focus.
 */
export const mountApp = (root: HTMLElement, controller: SearchController): void => {
  const input = element('input', {
    attrs: {
      type: 'search',
      placeholder: 'Search country…',
      autocomplete: 'off',
      'aria-label': 'Country name',
    },
  });
  input.addEventListener('input', () => controller.input(input.value));

  const area = element('main', { attrs: { 'aria-live': 'polite' } });

  root.replaceChildren(input, area);

  controller.subscribe((state) => area.replaceChildren(renderState(state)));
};
