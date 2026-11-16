import type { CountryCard } from './country-card';
import type { Currency, CountryResponse } from './country-response';

const formatCurrency = ({ name, symbol }: Currency): string | null => {
  if (!name) return null;
  return symbol ? `${name} (${symbol})` : name;
};

const getKind = (independent: boolean | undefined): string => {
  if (independent === undefined) return 'a country';
  return independent ? 'an independent country' : 'a territory';
};

const buildDescription = (raw: CountryResponse): string => {
  const location = raw.subregion || raw.region;
  const capital = raw.capital ? ` Its capital is ${raw.capital}.` : '';

  return `${raw.name} is ${getKind(raw.independent)} in ${location}.${capital}`;
};

/** Converts a raw API country into UI card data. */
export const mapCountryResponse = (raw: CountryResponse): CountryCard => ({
  code: raw.alpha3Code,
  name: raw.name,
  flagUrl: raw.flags?.svg || raw.flags?.png || null,
  capital: raw.capital || null,
  region: raw.region,
  population: raw.population ?? null,
  languages: (raw.languages ?? []).flatMap(({ name }) => (name ? [name] : [])),
  description: buildDescription(raw),
  area: raw.area ?? null,
  borders: [...(raw.borders ?? [])],
  currencies: (raw.currencies ?? []).flatMap((currency) => {
    const formatted = formatCurrency(currency);
    return formatted ? [formatted] : [];
  }),
});
