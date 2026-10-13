# MST Amendment Tool

Static client for viewing and editing MST calendars. The site is now prepared for GitHub Pages deployment by serving all public assets from the `docs/` directory.

> Why are `index.html` and `libs/` inside `docs/`? GitHub Pages serves content from the configured site root. By keeping the entry point and dependencies under `docs/`, everything published to Pages lives in one folder while the repository root stays clean for data artifacts like `MSTs.xlsx`.

## GitHub Pages

1. In the repository settings, enable GitHub Pages and select the `work` branch (or default branch) with `/docs` as the source directory.
2. Publish the site and access it at the URL provided by GitHub Pages (usually `https://<user>.github.io/<repo>/`).
3. Open `docs/index.html` locally if you prefer to run the app without GitHub Pages.

## Project layout

- `docs/index.html` – main entry point for the MST Amendment calendar UI.
- `docs/libs/` – JavaScript and CSS dependencies bundled for offline use.
- `docs/.nojekyll` – ensures GitHub Pages serves the static assets without Jekyll processing.
- `MSTs.xlsx` – example dataset for local testing (not served by GitHub Pages).
- `MST Download SQL.txt` – SQL query used to generate MST data.

## Planner how-to

See [MST Amendment Tool: Planner How-To](HOW_TO_PLANNERS.md) for a concise guide to using the calendar, exporting amendments, and troubleshooting common issues.

## Checks

Run `node --test tests/*.test.js` from the repository root. Tests cover advisory date boundaries, editor confirmation, export review and workbook round-trip, unsaved-work protection, frequency rebuilding and MST validation. UI tests use a simulated DOM; a browser check is still required to validate appearance and interaction on supported browsers.

## Bundled spreadsheet reader

The application loads the local SheetJS 0.20.3 bundle at `docs/libs/xlsx.full.min.js`, replacing the runtime CDN request. Source: https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js. The downloaded file's SHA-256 is `CC015130AA8521E7F088F88898EBA949CCDCBFB38DF0BD129B44B7273C3A6F41` (before any Git line-ending conversion).
