import { createCachedSearch } from './core/cached-search';
import { createSearchController } from './core/search-controller';
import { searchCountries } from './core/search-countries';
import { createSearchHistory, type HistoryStorage } from './core/search-history';
import './style.css';
import { mountApp } from './ui/app';
import { element } from './ui/dom';

/** Even touching `localStorage` can throw (blocked site data): then the history just stays empty. */
const getStorage = (): HistoryStorage => {
  try {
    return localStorage;
  } catch {
    return { getItem: (): null => null, setItem: (): void => undefined };
  }
};

const root = element('div', { className: 'app' });
document.body.append(root);

mountApp(
  root,
  createSearchController({ search: createCachedSearch(searchCountries) }),
  createSearchHistory(getStorage()),
);
