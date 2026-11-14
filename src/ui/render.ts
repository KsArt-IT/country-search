import type { ViewState } from '../core/view-state';
import { element } from './dom';

const renderIdle = (): HTMLElement =>
  element('p', { className: 'hint', text: 'Start typing a country name' });

/** Placeholder for the states that are not drawn yet: shows only the status. */
const renderPending = (state: ViewState): HTMLElement => element('p', { text: state.status });

export const renderState = (state: ViewState): HTMLElement => {
  switch (state.status) {
    case 'idle':
      return renderIdle();
    default:
      return renderPending(state);
  }
};
