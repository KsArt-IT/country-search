import { createCachedSearch } from './core/cached-search';
import { createSearchController } from './core/search-controller';
import { searchCountries } from './core/search-countries';
import './style.css';
import { mountApp } from './ui/app';
import { element } from './ui/dom';

const root = element('div', { className: 'app' });
document.body.append(root);

mountApp(root, createSearchController({ search: createCachedSearch(searchCountries) }));
