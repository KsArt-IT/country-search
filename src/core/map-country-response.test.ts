import { describe, expect, it } from 'vitest';
import type { CountryCard } from './country-card';
import type { CountryResponse } from './country-response';
import antarcticaJson from './fixtures/antarctica.json';
import spainJson from './fixtures/spain.json';
import ukraineJson from './fixtures/ukraine.json';
import { mapCountryResponse } from './map-country-response';

// The API answers with an array; a card is built from one element.
const spain = (spainJson as CountryResponse[])[0];
const ukraine = (ukraineJson as CountryResponse[])[0];
const antarctica = (antarcticaJson as CountryResponse[])[0];

const minimal = (overrides: Partial<CountryResponse> = {}): CountryResponse => ({
  name: 'Nowhere',
  alpha2Code: 'NW',
  alpha3Code: 'NWH',
  region: 'Europe',
  ...overrides,
});

describe('mapCountryResponse', () => {
  describe('full response', () => {
    it('maps Spain to a card', () => {
      expect(mapCountryResponse(spain)).toStrictEqual<CountryCard>({
        code: 'ESP',
        name: 'Spain',
        flagUrl: 'https://flagcdn.com/es.svg',
        capital: 'Madrid',
        region: 'Europe',
        population: 47351567,
        languages: ['Spanish'],
        description: 'Spain is an independent country in Southern Europe. Its capital is Madrid.',
        area: 505992,
        borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
        currencies: ['Euro (€)'],
      });
    });

    it('maps Ukraine to a card', () => {
      expect(mapCountryResponse(ukraine)).toStrictEqual<CountryCard>({
        code: 'UKR',
        name: 'Ukraine',
        flagUrl: 'https://flagcdn.com/ua.svg',
        capital: 'Kyiv',
        region: 'Europe',
        population: 44134693,
        languages: ['Ukrainian'],
        description: 'Ukraine is an independent country in Eastern Europe. Its capital is Kyiv.',
        area: 603700,
        borders: ['BLR', 'HUN', 'MDA', 'POL', 'ROU', 'RUS', 'SVK'],
        currencies: ['Ukrainian hryvnia (₴)'],
      });
    });

    it('uses English language names, not native ones', () => {
      expect(mapCountryResponse(spain).languages).not.toContain('Español');
      expect(mapCountryResponse(ukraine).languages).not.toContain('Українська');
    });
  });

  describe('response with missing fields (Antarctica)', () => {
    it('maps Antarctica to a card with a null capital', () => {
      expect(mapCountryResponse(antarctica)).toStrictEqual<CountryCard>({
        code: 'ATA',
        name: 'Antarctica',
        flagUrl: 'https://flagcdn.com/aq.svg',
        capital: null,
        region: 'Polar',
        population: 1000,
        languages: ['English', 'Russian'],
        description: 'Antarctica is a territory in Antarctica.',
        area: 14000000,
        borders: [],
        currencies: [],
      });
    });
  });

  describe('optional fields', () => {
    it('falls back to null / empty values when optional fields are absent', () => {
      expect(mapCountryResponse(minimal())).toStrictEqual<CountryCard>({
        code: 'NWH',
        name: 'Nowhere',
        flagUrl: null,
        capital: null,
        region: 'Europe',
        population: null,
        languages: [],
        description: 'Nowhere is a country in Europe.',
        area: null,
        borders: [],
        currencies: [],
      });
    });

    it('treats an empty capital string as a missing capital', () => {
      const card = mapCountryResponse(minimal({ capital: '' }));

      expect(card.capital).toBeNull();
      expect(card.description).not.toMatch(/capital/i);
    });

    it('keeps a population of 0 instead of treating it as missing', () => {
      expect(mapCountryResponse(minimal({ population: 0 })).population).toBe(0);
    });

    it('returns an empty list when languages is an empty array', () => {
      expect(mapCountryResponse(minimal({ languages: [] })).languages).toEqual([]);
    });

    it('skips languages without a name', () => {
      const raw = minimal({
        languages: [{ iso639_1: 'xx' }, { name: 'Spanish' }, { name: undefined }],
      });

      expect(mapCountryResponse(raw).languages).toEqual(['Spanish']);
    });
  });

  describe('flag', () => {
    const png = 'https://example.com/f.png';
    const svg = 'https://example.com/f.svg';

    it('prefers SVG when both formats are present', () => {
      expect(mapCountryResponse(minimal({ flags: { png, svg } })).flagUrl).toBe(svg);
    });

    it('falls back to PNG when SVG is absent', () => {
      expect(mapCountryResponse(minimal({ flags: { png } })).flagUrl).toBe(png);
    });

    it('uses SVG when PNG is absent', () => {
      expect(mapCountryResponse(minimal({ flags: { svg } })).flagUrl).toBe(svg);
    });

    it('falls back to PNG when SVG is an empty string', () => {
      expect(mapCountryResponse(minimal({ flags: { png, svg: '' } })).flagUrl).toBe(png);
    });

    it('is null when both flag URLs are empty strings', () => {
      expect(mapCountryResponse(minimal({ flags: { png: '', svg: '' } })).flagUrl).toBeNull();
    });

    it('is null when flags is an empty object', () => {
      expect(mapCountryResponse(minimal({ flags: {} })).flagUrl).toBeNull();
    });
  });

  describe('area', () => {
    it('is the number from the response, not a formatted string', () => {
      expect(mapCountryResponse(minimal({ area: 505992 })).area).toBe(505992);
    });

    it('keeps an area of 0 instead of treating it as missing', () => {
      expect(mapCountryResponse(minimal({ area: 0 })).area).toBe(0);
    });

    it('is null when the area is absent', () => {
      expect(mapCountryResponse(minimal()).area).toBeNull();
    });
  });

  describe('borders', () => {
    it('passes the border codes through as they are', () => {
      expect(mapCountryResponse(minimal({ borders: ['FRA', 'PRT'] })).borders).toEqual([
        'FRA',
        'PRT',
      ]);
    });

    it('is an empty list when borders is absent', () => {
      expect(mapCountryResponse(minimal()).borders).toEqual([]);
    });

    it('is an empty list when borders is an empty array', () => {
      expect(mapCountryResponse(minimal({ borders: [] })).borders).toEqual([]);
    });

    it('returns a new array, not a link into the input', () => {
      const raw = structuredClone(spain);

      mapCountryResponse(raw).borders.push('XXX');

      expect(raw.borders).toHaveLength(5);
    });
  });

  describe('currencies', () => {
    it('formats a currency as "name (symbol)"', () => {
      const raw = minimal({ currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }] });

      expect(mapCountryResponse(raw).currencies).toEqual(['Euro (€)']);
    });

    it('uses only the name when the symbol is absent', () => {
      const raw = minimal({ currencies: [{ code: 'XTS', name: 'Test coin' }] });

      expect(mapCountryResponse(raw).currencies).toEqual(['Test coin']);
    });

    it('uses only the name when the symbol is an empty string', () => {
      const raw = minimal({ currencies: [{ name: 'Test coin', symbol: '' }] });

      expect(mapCountryResponse(raw).currencies).toEqual(['Test coin']);
    });

    it('skips currencies without a name, even if they have a symbol', () => {
      const raw = minimal({
        currencies: [{ code: 'XXX', symbol: '¤' }, { name: 'Euro', symbol: '€' }, {}],
      });

      expect(mapCountryResponse(raw).currencies).toEqual(['Euro (€)']);
    });

    it('keeps the order of currencies', () => {
      const raw = minimal({
        currencies: [
          { name: 'Swiss franc', symbol: 'Fr' },
          { name: 'Euro', symbol: '€' },
        ],
      });

      expect(mapCountryResponse(raw).currencies).toEqual(['Swiss franc (Fr)', 'Euro (€)']);
    });

    it('is an empty list when currencies is absent or empty', () => {
      expect(mapCountryResponse(minimal()).currencies).toEqual([]);
      expect(mapCountryResponse(minimal({ currencies: [] })).currencies).toEqual([]);
    });
  });

  describe('description', () => {
    it('calls a non-independent country "a territory"', () => {
      const card = mapCountryResponse(minimal({ independent: false }));

      expect(card.description).toBe('Nowhere is a territory in Europe.');
    });

    it('calls an independent country "an independent country"', () => {
      const card = mapCountryResponse(minimal({ independent: true }));

      expect(card.description).toBe('Nowhere is an independent country in Europe.');
    });

    it('calls it a plain "country" when independence is unknown', () => {
      const card = mapCountryResponse(minimal({ independent: undefined }));

      expect(card.description).toBe('Nowhere is a country in Europe.');
    });

    it('adds the capital as a separate sentence', () => {
      const card = mapCountryResponse(minimal({ capital: 'Capitalia' }));

      expect(card.description).toBe('Nowhere is a country in Europe. Its capital is Capitalia.');
    });

    it('drops the capital phrase entirely when there is no capital', () => {
      const { description } = mapCountryResponse(minimal());

      expect(description).not.toMatch(/capital/i);
      expect(description).not.toContain('null');
      expect(description).not.toContain('undefined');
    });

    it('uses the subregion as the location when it is present', () => {
      const card = mapCountryResponse(minimal({ region: 'Europe', subregion: 'Southern Europe' }));

      expect(card.description).toBe('Nowhere is a country in Southern Europe.');
    });

    it('falls back to the region when the subregion is absent', () => {
      const card = mapCountryResponse(minimal({ region: 'Polar', subregion: undefined }));

      expect(card.description).toBe('Nowhere is a country in Polar.');
    });

    it('falls back to the region when the subregion is an empty string', () => {
      const card = mapCountryResponse(minimal({ region: 'Europe', subregion: '' }));

      expect(card.description).toBe('Nowhere is a country in Europe.');
    });

    it('is always a non-empty string, even for the most minimal response', () => {
      const { description } = mapCountryResponse(minimal());

      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });
  });

  describe('purity', () => {
    it('does not mutate the input', () => {
      const raw = structuredClone(spain);

      mapCountryResponse(raw);

      expect(raw).toEqual(spain);
    });

    it('works on a deeply frozen input', () => {
      const frozen = structuredClone(spain);
      Object.freeze(frozen);
      Object.freeze(frozen.flags);
      Object.freeze(frozen.languages);

      expect(() => mapCountryResponse(frozen)).not.toThrow();
    });

    it('returns equal results for equal inputs', () => {
      expect(mapCountryResponse(spain)).toStrictEqual(mapCountryResponse(spain));
    });

    it('returns a new languages array, not a link into the input', () => {
      const raw = structuredClone(spain);

      const card = mapCountryResponse(raw);
      card.languages.push('Klingon');

      expect(raw.languages).toHaveLength(1);
    });

    it('can be passed straight to Array.prototype.map', () => {
      const cards = [spain, ukraine, antarctica].map(mapCountryResponse);

      expect(cards.map((card) => card.code)).toEqual(['ESP', 'UKR', 'ATA']);
    });
  });
});
