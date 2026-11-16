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

## Features

- Search as you type with a 300 ms debounce; the previous request is aborted on every change of the input.
- Separate screens for loading, results, "nothing found" and errors (timeout, no connection, server error, other) with a "Retry" button that repeats the last query.
- Country details instead of the list on click, "Back" returns to the same list.
- Bonus: cache of responses by query (requests in flight are shared) and a history of recent queries in `localStorage`.

## Getting started

You need [Node.js](https://nodejs.org) 22 or newer and Git.

The code lives in the `country-search` branch; `main` stays empty by the task rules.

```bash
git clone https://github.com/KsArt-IT/country-search.git
cd country-search
git switch country-search
npm install
npm run dev
```

Open the address that Vite prints. The app is served under the base path of the deploy, so it is usually <http://localhost:5173/country-search/>.

To get the right branch with one command, you can clone it directly:

```bash
git clone --branch country-search https://github.com/KsArt-IT/country-search.git
```

## Scripts

| Command                 | What it does                                       |
| ----------------------- | -------------------------------------------------- |
| `npm run dev`           | Dev server with hot reload                         |
| `npm test`              | Run all tests once (Vitest)                        |
| `npm run test:watch`    | Run tests in watch mode                            |
| `npm run test:coverage` | Run tests with a coverage report                   |
| `npm run lint`          | Check the code with ESLint                         |
| `npm run format`        | Format all files with Prettier                     |
| `npm run typecheck`     | Check the types with `tsc`, without emitting files |
| `npm run build`         | Type-check and build the app into `dist/`          |
| `npm run preview`       | Serve the built app locally                        |
| `npm run deploy`        | Build and publish `dist/` to the `gh-pages` branch |

`npm install` also sets up the Husky git hooks: `pre-commit` runs lint-staged (ESLint, Prettier, `tsc` on the changed files) and `pre-push` runs `npm test`, so a push with failing tests is blocked.

## Project structure

```text
src/
  core/   logic without DOM: search, cache, history, debounce, errors,
          mapping, controller (tests are next to the files, *.test.ts)
  ui/     rendering of the states and the DOM helpers
  main.ts entry point: wires the core and the UI together
```

## Status

Work in progress in the `country-search` branch. `main` stays empty by the task rules.

## Links

- Deploy: [Open](https://ksart-it.github.io/country-search/)
- Design notes: [DESIGN.md](DESIGN.md)
