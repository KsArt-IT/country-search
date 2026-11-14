/**
 * Country data prepared for the UI card. Built from a raw API response by
 * `mapCountryResponse`; absent values are `null` / `[]` so the UI never has
 * to deal with `undefined`.
 */
export interface CountryCard {
  /** ISO 3166-1 alpha-3 code, unique per country (use as a list key). */
  code: string;
  name: string;
  /** Flag image URL (SVG preferred, PNG as a fallback). */
  flagUrl: string | null;
  capital: string | null;
  region: string;
  population: number | null;
  /** English names of the spoken languages. */
  languages: string[];

  // --- details ---
  /** One built sentence, never empty: "{name} is {kind} in {subregion}. Its capital is {capital}." */
  description: string;
  /** raw.area in km². Units and separators are added by the UI. */
  area: number | null;
  /** Neighbouring country codes as they come from the API; no data → []. */
  borders: string[];
  /** "Euro (€)", or "Euro" without a symbol; entries without a name are skipped. */
  currencies: string[];
}
