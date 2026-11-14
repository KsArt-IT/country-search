import type { CountryCard } from '../core/country-card';
import { formatNumber, formatText } from './format';

type Props = {
  readonly className?: string;
  /** Set through textContent, so it is never parsed as HTML. */
  readonly text?: string;
  readonly attrs?: Readonly<Record<string, string>>;
};

export const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  { className, text, attrs }: Props = {},
  children: readonly Node[] = [],
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
};

const cardField = (label: string, value: string): HTMLSpanElement =>
  element('span', { className: 'card-field', text: `${label}: ${value}` });

/**
 * The clickable card of a country: flag, name, capital, region, population.
 * A <button>, so it opens with the mouse and with the keyboard. Only phrasing
 * content inside, which is why everything is a <span>.
 */
export const createCard = (card: CountryCard): HTMLButtonElement => {
  const flag =
    card.flagUrl === null
      ? []
      : [
          element('img', {
            className: 'card-flag',
            attrs: { src: card.flagUrl, alt: `Flag of ${card.name}`, loading: 'lazy' },
          }),
        ];

  return element('button', { className: 'card', attrs: { type: 'button' } }, [
    ...flag,
    element('span', { className: 'card-body' }, [
      element('span', { className: 'card-name', text: card.name }),
      cardField('Capital', formatText(card.capital)),
      cardField('Region', formatText(card.region)),
      cardField('Population', formatNumber(card.population)),
    ]),
  ]);
};
