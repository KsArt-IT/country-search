import type { ViewState } from '../core/view-state';
import { element } from './dom';

/** Skeleton: shows only the status. Real per-state views come next. */
export const renderState = (state: ViewState): HTMLElement => element('p', { text: state.status });
