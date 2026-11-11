# Country Search

Live country search with the [countries.dev](https://countries.dev) API.
You type a name — the app sends requests as you type and shows matching countries.

The main goal of the task is to handle async requests correctly:

- cancel outdated requests with `AbortController` (no race of stale responses);
- `debounce` for user input;
- separate "nothing found" (404) from real errors (network, server, timeout);
- retry the last query after an error.

RS School · JS/Fullstack 2026 Q3 · task
[Country Search](https://github.com/rolling-scopes-school/tasks/blob/master/fullstack-engineering/tasks/country-search/README.md)

## Status

Work in progress in the `country-search` branch. `main` stays empty by the task rules.

## Links

- Deploy: _coming soon_
- Design notes: `DESIGN.md` (in the `country-search` branch)
