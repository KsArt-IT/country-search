import type { CountryCard } from '../core/country-card';
import { element } from './dom';
import { formatArea, formatList, formatNumber, formatText } from './format';

const cardField = (label: string, value: string): HTMLSpanElement =>
  element('span', { className: 'card-field', text: `${label}: ${value}` });

/** The flag image of a country; an empty list (nothing to draw) when it has no flag. */
const createFlag = (card: CountryCard, className: string): HTMLImageElement[] =>
  card.flagUrl === null
    ? []
    : [
        element('img', {
          className,
          attrs: { src: card.flagUrl, alt: `Flag of ${card.name}`, loading: 'lazy' },
        }),
      ];

/**
 * The clickable card of a country: flag, name, capital, region, population.
 * A <button>, so it opens with the mouse and with the keyboard. Only phrasing
 * content inside, which is why everything is a <span>.
 */
export const createCard = (card: CountryCard): HTMLButtonElement =>
  element('button', { className: 'card', attrs: { type: 'button' } }, [
    ...createFlag(card, 'card-flag'),
    element('span', { className: 'card-body' }, [
      element('span', { className: 'card-name', text: card.name }),
      cardField('Capital', formatText(card.capital)),
      cardField('Region', formatText(card.region)),
      cardField('Population', formatNumber(card.population)),
    ]),
  ]);

const detailItem = (label: string, value: string): HTMLDivElement =>
  element('div', { className: 'details-item' }, [
    element('dt', { text: label }),
    element('dd', { text: value }),
  ]);

/**
 * The details page of a country. Returns the back button next to the root,
 * so the caller can attach the click handler.
 */
export const createDetails = (
  card: CountryCard,
): { root: HTMLElement; backButton: HTMLButtonElement } => {
  const backButton = element('button', {
    className: 'back-button',
    text: '← Back to results',
    attrs: { type: 'button' },
  });

  const root = element('article', { className: 'details' }, [
    backButton,
    element('header', { className: 'details-header' }, [
      ...createFlag(card, 'details-flag'),
      element('h2', { text: card.name }),
    ]),
    element('p', { className: 'details-description', text: card.description }),
    element('dl', { className: 'details-list' }, [
      detailItem('Area', formatArea(card.area)),
      detailItem('Borders', formatList(card.borders)),
      detailItem('Languages', formatList(card.languages)),
      detailItem('Currencies', formatList(card.currencies)),
    ]),
  ]);

  return { root, backButton };
};
