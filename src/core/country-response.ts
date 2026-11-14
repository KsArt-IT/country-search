/** Raw country object as returned by the countries.dev API. */
export interface CountryResponse {
  name: string;
  topLevelDomain?: string[];
  alpha2Code: string;
  alpha3Code: string;
  callingCodes?: string[];
  capital?: string;
  altSpellings?: string[];
  subregion?: string;
  region: string;
  population?: number;
  latlng?: number[];
  demonym?: string;
  area?: number;
  timezones?: string[];
  /**
   * ISO 3166-1 alpha-3 codes of neighbouring countries.
   */
  borders?: string[];
  nativeName?: string;
  numericCode?: string;
  /**
   * Olympic committee code. Seen in live responses (Spain), absent for
   * territories such as Antarctica.
   */
  cioc?: string;
  /**
   * Gini index. Seen in live responses (Spain), absent for Antarctica.
   */
  gini?: number;
  /**
   * Whether the country is a sovereign state (`false` for Antarctica).
   */
  independent?: boolean;
  flags?: Flags;
  currencies?: Currency[];
  languages?: Language[];
  /**
   * Unicode flag emoji, derived from the ISO 3166-1 alpha-2 code.
   */
  flag?: string;
  maps?: Maps;
  /**
   * People per km² (population ÷ area), or null when area is unknown.
   */
  populationDensity?: number;
}

export interface Flags {
  /**
   * @format `uri`
   */
  svg?: string;

  /**
   * @format `uri`
   */
  png?: string;
}

export interface Currency {
  code?: string;
  name?: string;
  symbol?: string;
}

export interface Language {
  iso639_1?: string;
  iso639_2?: string;
  name?: string;
  nativeName?: string;
}

/**
 * Links to the country's location on popular map services.
 */
export interface Maps {
  /**
   * @format `uri`
   */
  googleMaps?: string;

  /**
   * @format `uri`
   */
  openStreetMaps?: string;
}
