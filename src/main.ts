import './style.css';
import { createSearchController } from './core/search-controller';
import { searchCountries } from './core/search-countries';
import { mountApp } from './ui/app';
import { element } from './ui/dom';

const root = element('div');
document.body.append(root);

mountApp(root, createSearchController({ search: searchCountries }));
